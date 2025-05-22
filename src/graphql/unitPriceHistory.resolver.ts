import { Resolver, Root, Query, Ctx, Arg, Info, Int } from 'type-graphql';
import { GraphQLContext } from '../context';
import { UtilityResolver } from './core/UtilityResolver';
import { Investment, UnitPriceHistoryEvent } from '../models';
import { InvestmentUnitPriceHistory } from '../models/InvestmentUnitPriceHistory';
import { InvestmentUnitPriceHistoryOrderBy } from '../inputs/InvestmentUnitPriceHistory/InvestmentUnitPriceHistoryOrderBy';
import { InvestmentUnitPriceHistoryFilter } from '../inputs/InvestmentUnitPriceHistory/InvestmentUnitPriceHistoryFilter';
import dayjs, { QUnitType, OpUnitType } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { PermissionLock } from '../decorators/permissionDecorator';
import { Permissions } from '../types/permissionsList';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver(type => UnitPriceHistoryEvent)
export class UnitPriceHistoryResolver extends UtilityResolver {
    @Query(type => [InvestmentUnitPriceHistory])
    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    public async investmentUnitPriceHistory(
        @Root() root: InvestmentUnitPriceHistory,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: InvestmentUnitPriceHistoryOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => InvestmentUnitPriceHistoryFilter, { nullable: true })
        where?: InvestmentUnitPriceHistoryFilter
    ): Promise<InvestmentUnitPriceHistory[]> {
        const repo = context.typeorm.getRepository(InvestmentUnitPriceHistory);
        const query = this.createQuery(repo, where, orderBy, skip, take);
        const result = await query.getMany();
        return result;
    }

    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    @Query(type => Int)
    public async investmentUnitPriceHistoryCount(
        @Root() root: InvestmentUnitPriceHistory,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('where', type => InvestmentUnitPriceHistoryFilter, { nullable: true })
        where?: InvestmentUnitPriceHistoryFilter
    ): Promise<number> {
        const repo = context.typeorm.getRepository(InvestmentUnitPriceHistory);
        const query = this.createQuery(repo, where);
        const result = await query.getCount();
        return result;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [UnitPriceHistoryEvent], { nullable: false })
    async unitPricePercentChangeHistory(
        @Ctx() context: GraphQLContext,
        @Arg('range', type => String) range: OpUnitType | QUnitType,
        @Arg('tzOffset') tzOffset: number
    ) {
        // typeorm
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
            const investments = await typeorm
                .createQueryBuilder(Investment, 'investment')
                .leftJoinAndSelect('investment.unitPriceHistory', 'unitPriceHistory')
                .orderBy('unitPriceHistory.closePriceAsOf', 'ASC')
                .addOrderBy('investment.orderNum', 'ASC')
                .getMany();

            if (!investments.length) return [];

            let day = rangeStart;
            const history = [];

            const initialVals = {};

            while (day <= rangeEnd) {
                const data = investments.reduce(
                    (acc, investment) => {
                        const { id } = investment;
                        // get most recent unit price record for this investment as of this day
                        const unitPrice = investment.unitPriceHistory
                            .filter(
                                unitPrice =>
                                    dayjs(unitPrice.closePriceAsOf).format('YYYY-MM-DD HH:mm:ss') <=
                                    day
                            )
                            .pop();
                        // fallback to 0 if undefined
                        acc.unitPrices[id] = unitPrice ? unitPrice.closePrice : null;

                        // check if this investment has a starting value, and if not, set it if applicable
                        if (!initialVals[id] && unitPrice) {
                            initialVals[id] = unitPrice.closePrice;
                        }

                        return acc;
                    },
                    { unitPrices: {} }
                );

                // format data for c3 chart
                history.push({
                    date: dayjs(day)
                        .add(tzOffset, 'hour')
                        .format('YYYY-MM-DD'),
                    values: investments.map(investment => {
                        // investment ID
                        const { id, name } = investment;

                        let returnVal = null;

                        // if this is the first iteration with a value, this will always return 0.
                        // otherwise, it will return a float representing the percentage change, (i.e: if the fund
                        // improved by 20%, this value will be '20.0')
                        if (initialVals[id]) {
                            const integer = data.unitPrices[id] / initialVals[id];
                            returnVal = (integer - 1) * 100;
                        }

                        return {
                            id,
                            name,
                            value: returnVal
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
        if (range === 'quarter' || range === 'Q') {
            dayjs.extend(quarterOfYear);
            return returnHistory(range);
        } else {
            return returnHistory(range);
        }
    }
}
