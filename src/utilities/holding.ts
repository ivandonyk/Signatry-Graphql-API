import { GLAccount, Holding, HoldingChangeSummary, InstitutionAccount } from '../models';
import { InstitutionAccountTransactionType } from '../models/InstitutionAccountTransaction';
import { HoldingAssetClass } from '../models/interfaces/Holding';
import { InstitutionAccountTransactionRepository } from '../repositories/InstitutionAccountTransaction';
import { getOrCreateConnection } from '../typeorm';
import { institutionAccountTransactionUtil } from '../utilities/institutionAccountTransaction';
import { currency } from './currency';
import { dayjs } from './datetime';
export const holdingUtil = {
    // Create mock holding record to make ending balance work only with transactions
    async getMockHolding(
        glAccount: GLAccount,
        holdingChange: HoldingChangeSummary,
        endDate: Date
    ): Promise<Holding> {
        const connection = await getOrCreateConnection();
        const transactions = await connection
            .getCustomRepository(InstitutionAccountTransactionRepository)
            .getUnreconciledTransactions(glAccount.id, endDate);
        // Add up un-matched transactions
        const transactionSum = transactions.reduce((sum, t) => currency.add(sum, t.amount), 0);
        // Create holding that offsets the actual change of balance and leaves transaction amount
        const offsetAmount = currency.add(
            -1 * Math.abs(holdingChange.changeInSecuritiesAfterTransactions),
            transactionSum
        );
        return connection.getRepository(Holding).create({
            id: 'MOCK',
            getId: () => 'MOCK',
            holdingId: 'MOCK',
            name: 'MOCK HOLDING',
            marketValue: offsetAmount,
            units: 1,
            unitPrice: offsetAmount,
            assetClass: HoldingAssetClass.CASH,
            getAssetClass: () => HoldingAssetClass.CASH,
            date: endDate,
            cumulativeAverageCost: 1,
            cumulativeRealized: 0,
            cumulativeUnrealized: 0,
            costBasis: 1
        });
    },

    async getHoldingChangeSummaryForAccount(glAccountId: string, startDate: Date, endDate: Date) {
        const connection = await getOrCreateConnection();
        const glAccount = await connection
            .getRepository(GLAccount)
            .createQueryBuilder('glAccount')
            .innerJoinAndSelect('glAccount.investment', 'investment')
            .leftJoinAndSelect('glAccount.tenantAccount', 'tenantAccount')
            .leftJoinAndSelect('glAccount.institutionAccount', 'institutionAccount')
            .where('glAccount.id = :glAccountId', { glAccountId: glAccountId })
            .andWhere('institutionAccount.isSweepAccount = false')
            .getOne();

        const sweepAccount = await connection.manager.findOne(InstitutionAccount, {
            institutionAccountId: glAccount.institutionAccount.id
        });

        const holdingRepo = connection.getRepository(Holding);

        /**
         * @note
         * add 1 day to `firstDate` because we want to fetch holdings for the day after last reconciliation
         * add 1 day to `endDate` because account BAA updates the following morning
         **/
        const dates = [startDate, endDate].map(d => ({
            start: dayjs(d)
                .add(1, 'day')
                .startOf('day')
                .format('YYYY-MM-DD HH:mm'),
            end: dayjs(d)
                .add(1, 'day')
                .endOf('day')
                .format('YYYY-MM-DD HH:mm')
        }));

        /**
         * @todo refactor to be more readable,
         * create queries for both holdings and sweep holdings
         * */
        const [queries, sweepQueries] = [dates, dates].map(date => {
            return date.map(({ start, end }) => {
                return holdingRepo
                    .createQueryBuilder('holding')
                    .leftJoinAndSelect('holding.security', 'security')
                    .where('holding.date >= :start', { start })
                    .andWhere('holding.date <= :end', { end });
            });
        });

        // get institutional/tenant account holdings
        let where = { field: '', value: '' };
        if (glAccount.institutionAccount) {
            where = { field: 'institutionAccountId', value: glAccount.institutionAccount.id };
        } else if (glAccount.tenantAccount) {
            where = { field: 'tenantAccountId', value: glAccount.tenantAccount.id };
        }
        queries.forEach(query => {
            query.andWhere(`holding.${where.field} = :accountId`, {
                accountId: where.value
            });
        });
        // get sweep accounts holdings
        sweepQueries.forEach(query => {
            query.andWhere('holding.institutionAccountId = :id', {
                id: sweepAccount && sweepAccount.id
            });
        });

        // fetch date in bulk
        const [
            // holdings
            startHoldings,
            endHoldings,
            // sweeps
            startSweepHoldings,
            endSweepHoldings
        ] = await Promise.all([
            ...queries.map(q => q.getMany()),
            // don't bother fetching sweet accounts if we're not using them
            ...sweepQueries.map(q => (sweepAccount ? q.getMany() : Promise.resolve([])))
        ]);

        const startHoldingsTotal = [...startHoldings, ...startSweepHoldings];
        const endHoldingsTotal = [...endHoldings, ...endSweepHoldings];

        const transactions = await connection
            .getCustomRepository(InstitutionAccountTransactionRepository)
            .getUnreconciledTransactions(glAccount.id, endDate, false);

        const transactionSummary = institutionAccountTransactionUtil.getTransactionSummary(
            transactions
        );

        const summary = new HoldingChangeSummary(
            startHoldingsTotal,
            endHoldingsTotal,
            transactionSummary
        );

        /*
        if (
            process.env.RECONCILIATION_MOCK_TRANSACTIONS === 'true' &&
            glAccount.investment.investmentType !== InvestmentType.IMA
        ) {
            const mockHolding = await this.getMockHolding(glAccount, summary, endDate);
            summary = new HoldingChangeSummary(
                startHoldingsTotal,
                [...endHoldingsTotal, mockHolding],
                buysAndSellsTotal
            );
        }
        */

        return summary;
    }
};
