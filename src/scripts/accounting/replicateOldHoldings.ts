import { getOrCreateConnection } from '../../typeorm';
import {
    ByAllAccountsUser,
    Holding,
    Security,
    InstitutionAccount,
    Investment,
    InvestmentUnitPriceHistory,
    FundInvestment,
    PoolInvestmentHolding,
    FundTransaction,
    FundTransactionDetail,
    TenantAccount
} from '../../models';
import { HoldingInterface, HoldingAssetClass } from '../../models/interfaces/Holding';
import { InvestmentType } from '../../models/Investment';
import { BAAFacade } from '../../morningstar/byallaccounts/facade';
import { BAAHolding } from '../../morningstar/byallaccounts/holding';
import { PlaidClient } from '../../plaid/client';
import { TransactionTypeValue } from '../../models/TransactionType';
import { TransactionStatusValue } from '../../models/TransactionStatus';
import { TransactionDetailStatusValue } from '../../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../../models/TransactionDetailType';
import { PoolInvestmentHoldingRepository } from '../../repositories/PoolInvestmentHolding';
import { AccountProviderName } from '../../models/ProviderAccountData';
import { dayjs, getStartAndEndOfYesterday } from '../../utilities/datetime';
import { eventEmitter, EVENTS } from '../../events';
import { currency } from '../../utilities/currency';
import {
    CostAndGainData,
    calculateHoldingCostAndGains
} from '../../utilities/calculateHoldingCostAndGains';
import { poolInvestmentUtil } from '../../utilities/poolInvestment';
const Cryptr = require('cryptr');

export async function replicateOldHoldings(institutionAccountId?: string) {
    console.log('Updating holding and security data');

    const connection = await getOrCreateConnection();
    const baaFacade = new BAAFacade();
    const { CRYPT_KEY } = process.env;
    const crypt = new Cryptr(CRYPT_KEY);

    const securityRepo = connection.getRepository(Security);
    const holdingRepo = connection.getRepository(Holding);
    const instAccountRepo = connection.getRepository(InstitutionAccount);
    const poolHoldingRepo = connection.getCustomRepository(PoolInvestmentHoldingRepository);
    const investmentRepo = connection.getRepository(Investment);
    const investmentPriceRepo = connection.getRepository(InvestmentUnitPriceHistory);
    const fundInvestmentRepo = connection.getRepository(FundInvestment);
    const transactionRepo = connection.getRepository(FundTransaction);
    const tenantAccountRepo = connection.getRepository(TenantAccount);
    const baaUser = await connection.getRepository(ByAllAccountsUser).findOne();
    const startOfToday = dayjs()
        .startOf('day')
        .format('YYYY-MM-DD');
    const endOfToday = dayjs('2021-06-21')
        .endOf('day')
        .format('YYYY-MM-DD');

    console.log('Storing institution account holdings');
    const storedSecurities = await securityRepo.createQueryBuilder('security').getMany();
    const instAccounts = await instAccountRepo.createQueryBuilder('instAccount').getMany();

    const accountsNotUpdated = await instAccountRepo.query(`
        SELECT ia.id 
        FROM (
            SELECT institution_account_id, max(date) as date
            FROM holding
            GROUP BY institution_account_id
        ) h
        JOIN institution_account ia
            ON ia.id = h.institution_account_id
        JOIN investment i
            ON i.institution_account_id = ia.id
        JOIN fund_investment fi
            ON fi.investment_id = i.id
        JOIN fund f
            ON f.id = fi.fund_id
        WHERE h.date < '2021-06-21'
        ORDER BY h.date ASC;
    `);

    const latestHoldingIds = await holdingRepo.query(`
        SELECT "holding"."id"
        FROM "holding"
        JOIN (
            SELECT "holding_id", MAX("date") AS "date"
            FROM "holding"
            GROUP BY "holding_id"
        ) "latest_holding"
            ON "holding"."date" = "latest_holding"."date"
            AND "holding"."holding_id" = "latest_holding"."holding_id"
            WHERE "latest_holding"."date" < '2021-06-21'
            AND "holding"."institution_account_id" IN (${accountsNotUpdated
                .map(account => `'${account['id']}'`)
                .join(',')})
    `);
    // Create holding records for today for holdings that are out of date
    const holdingInserts = [];

    const latestHoldings = await holdingRepo.findByIds(
        latestHoldingIds.map(result => result['id'])
    );
    // If account did not update for today, or is a manual account
    // copy data from previous day's holding record to current day to avoid gaps

    if (accountsNotUpdated.length > 0) {
        for (const holdingNotUpdated of latestHoldings) {
            holdingInserts.push({
                holdingId: holdingNotUpdated.holdingId,
                name: holdingNotUpdated.name,
                date: '2021-06-21 12:00:00',
                marketValue: holdingNotUpdated.marketValue,
                units: holdingNotUpdated.units,
                unitPrice: holdingNotUpdated.unitPrice,
                priceAsOf: holdingNotUpdated.priceAsOf,
                assetClass: holdingNotUpdated.assetClass,
                assetSubclass: holdingNotUpdated.assetSubclass,
                securityId: holdingNotUpdated.securityId,
                institutionAccountId: holdingNotUpdated.institutionAccountId,
                provider: AccountProviderName.BAA,
                costBasis: holdingNotUpdated.costBasis,
                cumulativeAverageCost: holdingNotUpdated.cumulativeAverageCost,
                cumulativeRealized: holdingNotUpdated.cumulativeRealized,
                cumulativeUnrealized: holdingNotUpdated.cumulativeUnrealized
            });
        }
    }

    let count = 0;
    for (const holdingInsert of holdingInserts) {
        count++;
        try {
            console.log(
                `${count} of ${holdingInserts.length} - Storing holding: ${holdingInsert.name}`
            );
            await holdingRepo.save(holdingInsert);
        } catch (error) {
            console.log(`Unable to store holding ${holdingInsert.name}`);
            console.log(error.message);
        }
    }
    console.log('Stored new holding data');
}
