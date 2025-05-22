import dayjs, { OpUnitType, QUnitType } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { Arg, Ctx, Query, Resolver, Root } from 'type-graphql';
import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import { FundInvestment, InvestmentHistoryEvent } from '../models';
import { InvestmentType } from '../models/Investment';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { UtilityResolver } from './core/UtilityResolver';

@Resolver(type => InvestmentHistoryEvent)
export class FundInvestmentResolver extends UtilityResolver {
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [FundInvestment])
    public async fundInvestmentPoolAllocations(
        @Root() root: FundInvestment,
        @Ctx() context: GraphQLContext,
        @Arg('fundId', type => String, { nullable: false })
        fundId: string,
        @Arg('includeShared', type => Boolean, { nullable: true }) includeShared = false
    ): Promise<FundInvestment[]> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        let investmentTypes = [InvestmentType.POOL, InvestmentType.IMA];

        if (includeShared) {
            investmentTypes = investmentTypes.concat([
                InvestmentType.CONTRIBUTION_CASH,
                InvestmentType.SHARED_STOCK,
                InvestmentType.GRANT_CASH
            ]);
        }

        const query = context.typeorm
            .createQueryBuilder(FundInvestment, 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .leftJoin('fundInvestment.fund', 'fund')
            .leftJoin('fund.userProfiles', 'userProfile')
            .where('fundInvestment.fundId = :fundId', { fundId })
            .andWhere('investment.investmentType IN (:...investmentTypes)', {
                investmentTypes
            })
            .orderBy('investment.orderNum', 'ASC');

        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        if (!userIsAuthorized) {
            query.andWhere(':userProfileId = userProfile.id', { userProfileId: profile.id });
        }

        return query.getMany();
    }

    @Query(type => [InvestmentHistoryEvent], { nullable: false })
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    async fundInvestmentHistory(
        @Ctx() context: GraphQLContext,
        @Arg('fundInvestmentIds', type => [String]) fundInvestmentIds: string[],
        @Arg('range', type => String) range: QUnitType | OpUnitType,
        @Arg('tzOffset') tzOffset: number
    ) {
        const { typeorm } = context;

        const returnHistory = async rangeProp => {
            // start of specified range
            const rangeStart = dayjs()
                .subtract(1, rangeProp)
                .endOf('day')
                .subtract(tzOffset, 'hour')
                .format('YYYY-MM-DD HH:mm:ss');

            // end of specified range
            const rangeEnd = dayjs()
                .add(tzOffset, 'hour')
                .endOf('day')
                .subtract(tzOffset, 'hour')
                .format('YYYY-MM-DD HH:mm:ss');

            // get fundInvestments, transactions, unitPrices, etc.
            const query = await typeorm
                .createQueryBuilder(FundInvestment, 'fundInvestment')
                .leftJoinAndSelect('fundInvestment.investment', 'investment')
                .leftJoinAndSelect('investment.unitPriceHistory', 'unitPriceHistory')
                .leftJoinAndSelect('fundInvestment.transactionDetails', 'transactionDetails')
                .where('fundInvestment.id IN (:...ids)', {
                    ids: fundInvestmentIds
                })
                .orderBy('unitPriceHistory.closePriceAsOf', 'ASC')
                .addOrderBy('investment.orderNum', 'ASC');

            const fundInvestments = await query.getMany();

            if (!fundInvestments.length) return [];

            let day = rangeStart;
            const history = [];

            while (day <= rangeEnd) {
                const data = fundInvestments.reduce(
                    (acc, fundInvestment) => {
                        // investment ID
                        const { investmentId } = fundInvestment;
                        // get most recent unit price record for this investment as of this day
                        const unitPrice = fundInvestment.investment.unitPriceHistory
                            .filter(
                                unitPrice =>
                                    dayjs(unitPrice.closePriceAsOf).format('YYYY-MM-DD HH:mm:ss') <=
                                    day
                            )
                            .pop();
                        // fallback to 0 if undefined
                        acc.unitPrices[investmentId] = unitPrice ? unitPrice.closePrice : 0;

                        // get transactions that resolved on or before this date
                        const transactionDetails = fundInvestment.transactionDetails.filter(
                            transactionDetail =>
                                dayjs(transactionDetail.resolvedDateTime).format(
                                    'YYYY-MM-DD HH:mm:ss'
                                ) <= day
                        );

                        if (!transactionDetails.length) {
                            // if no transactions before this date
                            acc.units[investmentId] = null;
                        } else {
                            // sum units in all transaction for this investment
                            acc.units[investmentId] = transactionDetails.reduce(
                                (fundInvestmentUnits, transactionDetail) => {
                                    fundInvestmentUnits += transactionDetail
                                        ? transactionDetail.units
                                        : 0;
                                    return fundInvestmentUnits;
                                },
                                0
                            );
                        }

                        return acc;
                    },
                    { units: {}, unitPrices: {} }
                );

                // format data for c3 chart
                history.push({
                    date: dayjs(day)
                        .add(tzOffset, 'hour')
                        .format('YYYY-MM-DD'),
                    values: fundInvestments.map(fundInvestment => {
                        // investment ID
                        const { investmentId } = fundInvestment;

                        // fund investment dollar amount
                        const value =
                            data.units[investmentId] !== null
                                ? data.units[investmentId] * data.unitPrices[investmentId]
                                : null;

                        return {
                            id: investmentId,
                            name: fundInvestment.investment.name,
                            value
                        };
                    })
                });

                // increment day
                day = dayjs(day)
                    .add(1, 'day')
                    .format('YYYY-MM-DD HH:mm:ss');
            }

            return history;
        };
        // typeorm
        if (range === 'quarter' || range === 'Q') {
            dayjs.extend(quarterOfYear);
            return returnHistory(range);
        } else {
            return returnHistory(range);
        }
    }
}
