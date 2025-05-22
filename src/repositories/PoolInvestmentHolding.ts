import { EntityRepository, Repository } from 'typeorm';
import { FundInvestment, PoolInvestmentHolding } from '../models';
import { InvestmentType } from '../models/Investment';
import { currency } from '../utilities/currency';
import { getStartAndEndOfDay, getStartAndEndOfToday } from '../utilities/datetime';

@EntityRepository(PoolInvestmentHolding)
export class PoolInvestmentHoldingRepository extends Repository<PoolInvestmentHolding> {
    async getCurrentPoolAndCashHoldingValueForFund(fundId: string): Promise<number> {
        const fundInvestmentIds = await this.getFundInvestmentIdsByType(fundId, [
            InvestmentType.POOL,
            InvestmentType.GRANT_CASH,
            InvestmentType.CONTRIBUTION_CASH
        ]);
        const holdings = await this.getCurrentPoolHoldingValuesByFundInvestments(fundInvestmentIds);
        return holdings;
    }

    async getCurrentCashHoldingValueForFund(fundId: string): Promise<number> {
        const fundInvestmentIds = await this.getFundInvestmentIdsByType(fundId, [
            InvestmentType.GRANT_CASH,
            InvestmentType.CONTRIBUTION_CASH
        ]);
        const holdings = await this.getCurrentPoolHoldingValuesByFundInvestments(fundInvestmentIds);
        return holdings;
    }

    async getCurrentSharedStockHoldingValueForFund(fundId: string): Promise<number> {
        const holdings = await this.getCurrentSharedStockHoldingsForFund(fundId);
        return holdings.reduce((sum, h) => {
            sum = currency.add(sum, h.marketValue);
            sum = currency.add(sum, h.receivable ?? 0);
            sum = currency.subtract(sum, h.payable ?? 0);
            return sum;
        }, 0);
    }

    async getCurrentPoolHoldingsForFund(fundId: string): Promise<PoolInvestmentHolding[]> {
        const fundInvestmentIds = await this.getFundInvestmentIdsByType(
            fundId,
            InvestmentType.POOL
        );
        if (fundInvestmentIds.length === 0) {
            return [];
        }
        return await this.getCurrentPoolHoldingsByFundInvestments(fundInvestmentIds);
    }

    async getCurrentPoolHoldingValueForFund(fundId: string): Promise<number> {
        const fundInvestmentIds = await this.getFundInvestmentIdsByType(
            fundId,
            InvestmentType.POOL
        );
        if (fundInvestmentIds.length === 0) {
            return 0;
        }
        return await this.getCurrentPoolHoldingValuesByFundInvestments(fundInvestmentIds);
    }

    async getCurrentSharedStockHoldingsForFund(fundId: string): Promise<PoolInvestmentHolding[]> {
        // Fetch all holdings in the shared stock accounts (liquidate, hold, Vanguard)
        const fundInvestmentIds = await this.getFundInvestmentIdsByType(
            fundId,
            InvestmentType.SHARED_STOCK
        );
        if (fundInvestmentIds.length === 0) {
            return [];
        }
        // There may be more than one holding in each account, get the security ids and
        // then query per fund investment
        const securityIdResults = await this.createQueryBuilder('holding')
            .select('DISTINCT(holding.securityId)', 'securityId')
            .where('holding.fundInvestmentId IN (:...fundInvestmentIds)', {
                fundInvestmentIds: fundInvestmentIds
            })
            .getRawMany();
        if (securityIdResults.length === 0) {
            return [];
        }
        const securityIds = securityIdResults.map(result => result['securityId']);
        const results = await Promise.all(
            fundInvestmentIds.map(fundInvestmentId => {
                return Promise.all(
                    securityIds.map(securityId =>
                        this.getCurrentPoolHoldingByFundInvestmentAndSecurity(
                            fundInvestmentId,
                            securityId
                        )
                    )
                );
            })
        );
        return results.flat().filter(Boolean); // Flattens nested array and filters out 'undefined' results
    }

    async getCurrentContributionCashHoldingForFund(fundId: string): Promise<PoolInvestmentHolding> {
        const fundInvestmentIds = await this.getFundInvestmentIdsByType(
            fundId,
            InvestmentType.CONTRIBUTION_CASH
        );
        const result = await this.getCurrentPoolHoldingsByFundInvestments(fundInvestmentIds);
        return result.pop() ?? null;
    }

    async getCurrentGrantCashHoldingForFund(fundId: string): Promise<PoolInvestmentHolding> {
        const fundInvestmentIds = await this.getFundInvestmentIdsByType(
            fundId,
            InvestmentType.GRANT_CASH
        );
        const result = await this.getCurrentPoolHoldingsByFundInvestments(fundInvestmentIds);
        return result.pop() ?? null;
    }

    async getCurrentCashHoldingsForFund(fundId: string): Promise<PoolInvestmentHolding[]> {
        const fundInvestmentIds = await this.getFundInvestmentIdsByType(fundId, [
            InvestmentType.CONTRIBUTION_CASH,
            InvestmentType.GRANT_CASH
        ]);
        if (fundInvestmentIds.length === 0) {
            return [];
        }
        return await this.getCurrentPoolHoldingsByFundInvestments(fundInvestmentIds);
    }

    async getCurrentPoolHoldingsByFundInvestments(
        fundInvestmentIds: string[]
    ): Promise<PoolInvestmentHolding[]> {
        // Get latest holding of each fund investment
        const results = await Promise.all(
            fundInvestmentIds.map(fundInvestmentId => {
                return this.getCurrentPoolHoldingByFundInvestment(fundInvestmentId);
            })
        );
        return results.filter(Boolean); // Filters out 'undefined' results
    }

    async getCurrentPoolHoldingValuesByFundInvestments(
        fundInvestmentIds: string[]
    ): Promise<number> {
        if (fundInvestmentIds.length === 0) {
            return 0;
        }
        const idString = fundInvestmentIds.map(id => `'${id}'`).join(',');
        // Retrieves latest pool holding record per fund investment
        const [{ result }] = await this.query(`
            SELECT SUM(
                COALESCE(
                (SELECT 
                    COALESCE(pih.market_value, 0) +
                    (COALESCE(pih.payable, 0) * -1) +
                    COALESCE(pih.receivable, 0)
                FROM pool_investment_holding pih
                WHERE pih.fund_investment_id = fi.id
                ORDER BY date DESC
                LIMIT 1), 0)
            ) AS result
            FROM fund_investment fi
            WHERE fi.id IN (${idString})
        `);

        return Number.parseFloat(result);
    }

    async getCurrentPoolHoldingByFundInvestment(
        fundInvestmentId: string
    ): Promise<PoolInvestmentHolding> {
        return await this.createQueryBuilder('holding')
            .innerJoinAndSelect('holding.fundInvestment', 'fundInvestment')
            .innerJoinAndSelect('fundInvestment.investment', 'investment')
            .where('holding.fundInvestmentId = :fundInvestmentId', {
                fundInvestmentId: fundInvestmentId
            })
            .orderBy('holding.date', 'DESC')
            .getOne();
    }

    async getCurrentPoolHoldingValueByFundInvestment(fundInvestmentId: string): Promise<number> {
        const result = await this.createQueryBuilder('holding')
            .where('holding.fundInvestmentId = :fundInvestmentId', {
                fundInvestmentId: fundInvestmentId
            })
            .orderBy('holding.date', 'DESC')
            .getOne();

        if (!result) return 0;

        return result.netValue;
    }

    async getCurrentPoolHoldingByFundInvestmentAndSecurity(
        fundInvestmentId: string,
        securityId: string
    ): Promise<PoolInvestmentHolding> {
        return await this.createQueryBuilder('holding')
            .leftJoinAndSelect('holding.fundInvestment', 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .where('holding.securityId = :securityId', {
                securityId: securityId
            })
            .andWhere('holding.fundInvestmentId = :id', {
                id: fundInvestmentId
            })
            .orderBy('holding.date', 'DESC')
            .getOne();
    }

    // async getSecurity(
    //     fundInvestmentId: string,
    //     securityId: string
    // ): Promise<PoolInvestmentHolding> {
    //     const holding = await this.createQueryBuilder('holding')
    //         .where('holding.fundInvestmentId = :fundInvestmentId', {
    //             fundInvestmentId: fundInvestmentId,
    //             securityId: securityId
    //         })
    //         .orderBy('holding.date', 'DESC')
    //         .getOne();
    //     return holding;
    // }

    async getSharedStockHoldingsForFundByDate(
        fundId: string,
        date: Date
    ): Promise<PoolInvestmentHolding[]> {
        const { startOfDay, endOfDay } = getStartAndEndOfDay(date);
        const holding = this.createQueryForTypeAndFund(fundId, InvestmentType.SHARED_STOCK)
            .leftJoinAndSelect('holding.security', 'sec')
            .leftJoinAndSelect('sec.holdings', 'holdings')
            .andWhere('holding.date >= :startOfDay', { startOfDay: startOfDay })
            .andWhere('holding.date <= :endOfDay', { endOfDay: endOfDay })
            .orderBy('holding.date', 'DESC')
            .getMany();
        if (!holding) {
            // If no holdings and date is today, try fetching latest holdings
            const { startOfDay: startOfToday } = getStartAndEndOfToday();
            if (startOfDay === startOfToday) {
                return this.getCurrentSharedStockHoldingsForFund(fundId);
            }
        }
        return holding;
    }
    async getContributionCashHoldingForFundByDate(
        fundId: string,
        date: Date
    ): Promise<PoolInvestmentHolding> {
        const { startOfDay, endOfDay } = getStartAndEndOfDay(date);
        const holding = this.createQueryForTypeAndFund(fundId, InvestmentType.CONTRIBUTION_CASH)
            .andWhere('holding.date >= :startOfDay', { startOfDay: startOfDay })
            .andWhere('holding.date <= :endOfDay', { endOfDay: endOfDay })
            .orderBy('holding.date', 'DESC')
            .getOne();
        if (!holding) {
            // If no holdings and date is today, try fetching latest holdings
            const { startOfDay: startOfToday } = getStartAndEndOfToday();
            if (startOfDay === startOfToday) {
                return this.getCurrentContributionCashHoldingForFund(fundId);
            }
        }
        return holding;
    }

    async getGrantCashHoldingForFundByDate(
        fundId: string,
        date: Date
    ): Promise<PoolInvestmentHolding> {
        const { startOfDay, endOfDay } = getStartAndEndOfDay(date);
        const holding = this.createQueryForTypeAndFund(fundId, InvestmentType.GRANT_CASH)
            .andWhere('holding.date >= :startOfDay', { startOfDay: startOfDay })
            .andWhere('holding.date <= :endOfDay', { endOfDay: endOfDay })
            .orderBy('holding.createdOn', 'DESC')
            .getOne();
        if (!holding) {
            // If no holdings and date is today, try fetching latest holdings
            const { startOfDay: startOfToday } = getStartAndEndOfToday();
            if (startOfDay === startOfToday) {
                return this.getCurrentGrantCashHoldingForFund(fundId);
            }
        }
        return holding;
    }

    async getPoolHoldingsForFundByDate(
        fundId: string,
        date: Date
    ): Promise<PoolInvestmentHolding[]> {
        const { startOfDay, endOfDay } = getStartAndEndOfDay(date);
        // If date is today, fetch latest holdings
        const holdings = await this.createQueryForTypeAndFund(fundId, InvestmentType.POOL)
            .andWhere('holding.date >= :startOfDay', { startOfDay: startOfDay })
            .andWhere('holding.date <= :endOfDay', { endOfDay: endOfDay })
            .orderBy('investment.name', 'ASC')
            .getMany();
        if (holdings.length === 0) {
            // If no holdings and date is today, try fetching latest holdings
            const { startOfDay: startOfToday } = getStartAndEndOfToday();
            if (startOfDay === startOfToday) {
                return this.getCurrentPoolHoldingsForFund(fundId);
            }
        }
        return holdings;
    }

    async getCashHoldingsForFundByDate(
        fundId: string,
        date: Date
    ): Promise<PoolInvestmentHolding[]> {
        const { startOfDay, endOfDay } = getStartAndEndOfDay(date);
        // If date is today, fetch latest holdings
        const holdings = await this.createQueryForTypeAndFund(fundId, [
            InvestmentType.GRANT_CASH,
            InvestmentType.CONTRIBUTION_CASH
        ])
            .andWhere('holding.date >= :startOfDay', { startOfDay: startOfDay })
            .andWhere('holding.date <= :endOfDay', { endOfDay: endOfDay })
            .orderBy('investment.name', 'ASC')
            .getMany();
        if (holdings.length === 0) {
            // If no holdings and date is today, try fetching latest holdings
            const { startOfDay: startOfToday } = getStartAndEndOfToday();
            if (startOfDay === startOfToday) {
                return this.getCurrentCashHoldingsForFund(fundId);
            }
        }
        return holdings;
    }

    private createQueryForTypeAndFund(
        fundId: string,
        investmentType: InvestmentType | InvestmentType[]
    ) {
        const types = [].concat(investmentType);
        return this.createQueryBuilder('holding')
            .leftJoinAndSelect('holding.fundInvestment', 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .where('investment.investmentType IN (:...types)', {
                types: types
            })
            .andWhere('fundInvestment.fundId = :fundId', { fundId: fundId });
    }

    private createQueryForLastestHolding(fundInvestmentId: string) {
        return this.createQueryBuilder('holding')
            .leftJoinAndSelect('holding.fundInvestment', 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .where('holding.fundInvestmentId = :fundInvestmentId', {
                fundInvestmentId: fundInvestmentId
            })
            .orderBy('holding.date', 'DESC');
    }

    private async getFundInvestmentIdsByType(
        fundId: string,
        investmentType: InvestmentType | InvestmentType[]
    ): Promise<string[]> {
        const types = [].concat(investmentType);
        const fundInvestmentIdResults = await this.manager
            .getRepository(FundInvestment)
            .createQueryBuilder('fundInvestment')
            .select('fundInvestment.id', 'id')
            .innerJoin('fundInvestment.investment', 'investment')
            .where('fundInvestment.fundId = :fundId', { fundId: fundId })
            .andWhere('investment.investmentType IN (:...types)', {
                types: types
            })
            .getRawMany();
        return fundInvestmentIdResults.map(result => result.id);
    }

    async getFundInvestmentsByType(
        fundId: string,
        investmentType: InvestmentType | InvestmentType[]
    ): Promise<string[]> {
        const types = [].concat(investmentType);
        const fundInvestmentResults = this.query(`

            SELECT * FROM "fund_investment"
            LEFT JOIN "investment"
                ON "fund_investment"."investment_id" = "investment"."id"
            WHERE "fund_investment"."fund_id" = '${fundId}'
            

        `)
        return fundInvestmentResults;
    }
}
