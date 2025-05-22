import { Resolver, Ctx, Arg, Query, Int } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { Permissions } from '../types/permissionsList';
import { PermissionLock } from '../decorators/permissionDecorator';
import { GraphQLContext } from '../context';
import { Investment, InvestmentType } from '../models/Investment';
import { InvestmentPerformance, PerformanceRange } from '../models/InvestmentPerformance';
import dayjs from 'dayjs';
import { PerformanceOrderBy } from '../inputs/Performance/PerformanceOrderBy';
import { validUUID } from '../utilities/validation';
import { OrderBy } from '../inputs/core/OrderBy';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver()
export class PerformanceResolver extends UtilityResolver {
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.READ)
    @Query(type => [Investment])
    async investmentsList(
        @Ctx() context: GraphQLContext,
        @Arg('fundId', { nullable: false }) fundId?: string
    ): Promise<Investment[]> {
        const { manager } = context.typeorm;

        const query = manager
            .getRepository(Investment)
            .createQueryBuilder('investment')
            .leftJoin('investment.fundAllocations', 'fundInvestment')
            .leftJoin('fundInvestment.fund', 'fund')
            .where('fund.id = :fundId and investment.investment_type in (:...investmentTypes)', {
                fundId,
                investmentTypes: [InvestmentType.POOL, InvestmentType.IMA]
            })
            .orderBy('investment.orderNum < 0')
            .addOrderBy('investment.orderNum', 'ASC');

        return query.getMany();
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.READ)
    @Query(type => [InvestmentPerformance])
    async investmentPerformance(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string,
        @Arg('investmentIds', type => [String]) investmentIds: string[],
        @Arg('range', type => PerformanceRange) range: PerformanceRange,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('orderBy', { nullable: true }) orderBy?: PerformanceOrderBy
    ): Promise<InvestmentPerformance[]> {
        const { manager } = context.typeorm;
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        // validate UUIDs
        if (
            !validUUID.test(fundId) ||
            (investmentIds && !investmentIds.every(id => validUUID.test(id)))
        ) {
            throw Error('Invalid UUID');
        }

        // validate dates
        if (!Object.keys(range).every(key => range[key] === null || dayjs(range[key]).isValid())) {
            throw Error('Invalid date');
        }

        const investmentsQuery = manager
            .getRepository(Investment)
            .createQueryBuilder('investment')
            .leftJoin('investment.fundAllocations', 'fundInvestment')
            .leftJoin('fundInvestment.fund', 'fund')
            .where('fund.id = :fundId and investment.investment_type in (:...investmentTypes)', {
                fundId,
                investmentTypes: [InvestmentType.POOL, InvestmentType.IMA]
            });

        if (investmentIds.length > 0) {
            investmentsQuery.where('investment.id IN (:...investmentIds)', { investmentIds });
        }

        const selectedInvestments = await investmentsQuery
            .orderBy('investment.orderNum', 'ASC')
            .getMany();

        const performanceData = [];

        // we are only pulling in POOL's and IMA's
        for (const investment of selectedInvestments) {
            let investmentHoldings;

            // Query pool holdings
            if (investment.investmentType === InvestmentType.POOL) {
                investmentHoldings = await this.getPoolPerformance(
                    context,
                    fundId,
                    investment.id,
                    range,
                    skip,
                    take,
                    orderBy
                );
            } else if (investment.investmentType === InvestmentType.IMA) {
                //Query IMA holdings
                investmentHoldings = await this.getIMAPerformance(
                    context,
                    fundId,
                    investment.id,
                    range,
                    skip,
                    take,
                    orderBy
                );
            }

            performanceData.push({
                investmentId: investment.id,
                color: investment.visualizationColor,
                name: investment.name,
                performance: investmentHoldings.map(holding => {
                    return {
                        date: holding.holding_date,
                        beginningBalance: holding.beginning_balance,
                        endingBalance: holding.ending_balance
                    };
                })
            });
        }

        return performanceData;
    }

    private async getIMAPerformance(
        context: GraphQLContext,
        fundId: string,
        investmentId: string,
        range: PerformanceRange,
        skip: number,
        take: number,
        orderBy: PerformanceOrderBy
    ) {
        return context.typeorm.manager.query(/*sql*/ `
            WITH investment_holdings AS (
                SELECT
                    h.date::DATE as holding_date,
                    SUM(h.market_value) as market_value
                FROM holding h
                LEFT JOIN investment i ON i.institution_account_id = h.institution_account_id
                WHERE i.id = '${investmentId}'
                ${range.start ? `AND date::DATE >= '${dayjs(range.start).format()}'` : ''}
                ${range.end ? `AND date::DATE <= '${dayjs(range.end).format()}'` : ''}
                GROUP BY h.institution_account_id, h.date::DATE
                ORDER BY h.date::DATE
            )
            SELECT
                holding_date,
                market_value AS ending_balance,
                LAG(market_value, 1) OVER (
                    ORDER BY holding_date
                ) beginning_balance
            FROM investment_holdings
            GROUP BY holding_date, market_value
            ${this.getPerformanceOrderBy(orderBy)}
            ${skip ? `OFFSET ${skip}` : ''}
            ${take ? `LIMIT ${take}` : ''};
        `);
    }

    private async getPoolPerformance(
        context: GraphQLContext,
        fundId: string,
        investmentId: string,
        range: PerformanceRange,
        skip: number,
        take: number,
        orderBy: PerformanceOrderBy
    ) {
        return context.typeorm.manager.query(/*sql*/ `
            WITH investment_holdings AS (
                SELECT
                    h.date::DATE as holding_date,
                    h.market_value
                FROM pool_investment_holding h
                LEFT JOIN fund_investment fi ON h.fund_investment_id = fi.id
                LEFT JOIN investment i ON fi.investment_id = i.id
                WHERE fi.fund_id = '${fundId}'
                AND i.id = '${investmentId}'
                ${range.start ? `AND date::DATE >= '${dayjs(range.start).format()}'` : ''}
                ${range.end ? `AND date::DATE <= '${dayjs(range.end).format()}'` : ''}
                ORDER BY date::DATE, i.order_num
            )
            SELECT
                holding_date,
                market_value AS ending_balance,
                LAG(market_value, 1) OVER (
                    ORDER BY holding_date
                ) beginning_balance
            FROM investment_holdings
            GROUP BY holding_date, market_value
            ${this.getPerformanceOrderBy(orderBy)}
            ${skip ? `OFFSET ${skip}` : ''}
            ${take ? `LIMIT ${take}` : ''};
        `);
    }

    private getPerformanceOrderBy(orderBy: PerformanceOrderBy) {
        if (!orderBy) return 'ORDER BY holding_date DESC';
        const field = Object.keys(orderBy)[0];
        switch (field) {
            case 'date': {
                return `ORDER BY holding_date ${orderBy[field]}`;
            }
            case 'beginningBalance': {
                return `ORDER BY beginning_balance ${orderBy[field]} NULLS LAST`;
            }
            case 'endingBalance': {
                return `ORDER BY ending_balance ${orderBy[field]}`;
            }
            case 'delta': {
                return `ORDER BY ABS(market_value - LAG(market_value, 1) OVER (ORDER BY holding_date)) ${orderBy[field]}`;
            }
        }
    }
}
