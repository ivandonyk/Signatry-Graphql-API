import { EntityRepository, Repository } from 'typeorm';
import { Holding, InstitutionAccount } from '../models';
import { InvestmentType } from '../models/Investment';
import { currency } from '../utilities/currency';
import { dayjs, getStartAndEndOfDay, getStartAndEndOfToday } from '../utilities/datetime';

@EntityRepository(Holding)
export class HoldingRepository extends Repository<Holding> {
    async getCurrentIMAHoldingValueForFund(fundId: string, investmentId?: string): Promise<number> {
        const accountIds = await this.getIMAInstitutionAccountIdsForFund(fundId, investmentId);
        if (accountIds.length === 0) {
            return 0;
        }
        const currentHoldings = await this.getCurrentHoldingsValueForInstitutionAccounts(
            accountIds
        );
        return currentHoldings;
    }

    async getCurrentIMAHoldingsForFund(fundId: string, investmentId?: string): Promise<Holding[]> {
        const accountIds = await this.getIMAInstitutionAccountIdsForFund(fundId, investmentId);
        if (accountIds.length === 0) {
            return [];
        }
        return await this.getCurrentHoldingsForInstitutionAccounts(accountIds);
    }

    async getIMAHoldingsForFundByDate(fundId: string, date: Date): Promise<Holding[]> {
        const { startOfDay, endOfDay } = getStartAndEndOfDay(date);
        // If date is today, fetch latest holdings
        const holdings = await this.createQueryForFund(fundId)
            .andWhere('holding.date >= :startOfDay', { startOfDay: startOfDay })
            .andWhere('holding.date <= :endOfDay', { endOfDay: endOfDay })
            .orderBy('holding.name', 'ASC')
            .getMany();
        if (holdings.length === 0) {
            // If no holdings and date is today, try fetching yesterday's holdings
            const { startOfDay: startOfToday } = getStartAndEndOfToday();
            if (startOfDay === startOfToday) {
                const yesterday = dayjs()
                    .subtract(1, 'day')
                    .toDate();
                return this.getIMAHoldingsForFundByDate(fundId, yesterday);
            }
        }
        return holdings;
    }

    async getIMAInstitutionAccountIdsForFund(
        fundId: string,
        investmentId?: string
    ): Promise<string[]> {
        const institutionAccountIdQuery = await this.manager
            .getRepository(InstitutionAccount)
            .createQueryBuilder('institutionAccount')
            .select('institutionAccount.id', 'id')
            .innerJoin('institutionAccount.investment', 'investment')
            .innerJoin('investment.fundAllocations', 'fundAllocations')
            .where('fundAllocations.fundId = :fundId', { fundId: fundId })
            .andWhere('investment.investmentType = :investmentType', {
                investmentType: InvestmentType.IMA
            });
        if (investmentId) {
            institutionAccountIdQuery.andWhere('investment.id = :investmentId', {
                investmentId: investmentId
            });
        }
        const institutionAccountIdResults = await institutionAccountIdQuery.getRawMany();
        return institutionAccountIdResults.map(result => result.id);
    }

    async getCurrentHoldingsForInstitutionAccounts(
        institutionAccountIds: string[]
    ): Promise<Holding[]> {
        const results = await Promise.all(
            institutionAccountIds.map(institutionAccountId => {
                return this.getCurrentHoldingsForInstitutionAccount(institutionAccountId);
            })
        );
        return results.flat();
    }

    async getCurrentHoldingsForInstitutionAccount(
        institutionAccountId: string
    ): Promise<Holding[]> {
        const latestHoldingDate = await this.createQueryBuilder('holding')
            .select('DATE(holding.date)', 'date')
            .where('holding.institutionAccountId = :institutionAccountId', {
                institutionAccountId: institutionAccountId
            })
            .orderBy('holding.date', 'DESC')
            .getRawOne();
        if (!latestHoldingDate || !latestHoldingDate['date']) {
            return [];
        }
        return await this.createQueryBuilder('holding')
            .innerJoinAndSelect('holding.institutionAccount', 'institutionAccount')
            .innerJoinAndSelect('institutionAccount.investment', 'investment')
            .where('holding.institutionAccountId = :institutionAccountId', {
                institutionAccountId: institutionAccountId
            })
            .andWhere('holding.date > :latestHoldingDate', {
                latestHoldingDate: latestHoldingDate['date']
            })
            .getMany();
    }

    async getCurrentHoldingsValueForInstitutionAccounts(
        institutionAccountIds: string[]
    ): Promise<number> {
        const results = await Promise.all(
            institutionAccountIds.map(institutionAccountId => {
                return this.getCurrentHoldingsValueForInstitutionAccount(institutionAccountId);
            })
        );
        return results.reduce((result, sum) => currency.add(result, sum), 0);
    }

    async getCurrentHoldingsValueForInstitutionAccount(
        institutionAccountId: string
    ): Promise<number> {
        const latestHoldingDate = await this.createQueryBuilder('holding')
            .select('DATE(holding.date)', 'date')
            .where('holding.institutionAccountId = :institutionAccountId', {
                institutionAccountId: institutionAccountId
            })
            .orderBy('holding.date', 'DESC')
            .getRawOne();
        if (!latestHoldingDate || !latestHoldingDate['date']) {
            return 0;
        }
        const result = await this.createQueryBuilder('holding')
            .select('COALESCE(SUM(holding.marketValue), 0)', 'marketValue')
            .where('holding.institutionAccountId = :institutionAccountId', {
                institutionAccountId: institutionAccountId
            })
            .andWhere('holding.date >= :latestHoldingDate', {
                latestHoldingDate: latestHoldingDate['date']
            })
            .getRawOne();
        return Number.parseFloat(result?.marketValue ?? 0);
    }

    private createQueryForFund(fundId: string) {
        return this.createQueryBuilder('holding')
            .leftJoinAndSelect('holding.security', 'security')
            .leftJoinAndSelect('holding.institutionAccount', 'institutionAccount')
            .leftJoinAndSelect('institutionAccount.investment', 'investment')
            .leftJoinAndSelect('investment.fundAllocations', 'fundAllocations')
            .where('investment.investmentType = :investmentType', {
                investmentType: InvestmentType.IMA
            })
            .andWhere('fundAllocations.fundId = :fundId', { fundId: fundId });
    }
}
