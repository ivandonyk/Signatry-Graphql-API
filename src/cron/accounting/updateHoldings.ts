import { In, UpdateResult } from 'typeorm';
import {
    ByAllAccountsUser,
    Holding,
    InstitutionAccount,
    Investment,
    PoolInvestmentHolding,
    Security,
    TenantAccount
} from '../../models';
import { HoldingAssetClass, HoldingInterface } from '../../models/interfaces/Holding';
import { InvestmentType } from '../../models/Investment';
import { AccountProviderName } from '../../models/ProviderAccountData';
import { BAAFacade } from '../../morningstar/byallaccounts/facade';
import { PlaidClient } from '../../plaid/client';
import { PoolInvestmentHoldingRepository } from '../../repositories/PoolInvestmentHolding';
import { getOrCreateConnection } from '../../typeorm';
import { bulkSave } from '../../utilities/bulkSave';
import {
    calculateHoldingCostAndGains,
    CostAndGainData
} from '../../utilities/calculateHoldingCostAndGains';
import { currency } from '../../utilities/currency';
import { dayjs, getStartAndEndOfToday } from '../../utilities/datetime';
import { poolInvestmentUtil } from '../../utilities/poolInvestment';

const Cryptr = require('cryptr');

export async function updateInstitutionAccountHoldings(institutionAccountId?: string) {
    console.log('updateInstitutionAccountHoldings: Started');

    const connection = await getOrCreateConnection();
    const baaFacade = new BAAFacade();
    const { CRYPT_KEY } = process.env;
    const crypt = new Cryptr(CRYPT_KEY);

    const securityRepo = connection.getRepository(Security);
    const holdingRepo = connection.getRepository(Holding);
    const instAccountRepo = connection.getRepository(InstitutionAccount);
    const tenantAccountRepo = connection.getRepository(TenantAccount);
    const baaUser = await connection.getRepository(ByAllAccountsUser).findOne();

    async function saveSecurities(securities: any[]) {
        const result = await securityRepo
            .createQueryBuilder('security')
            .insert()
            .into(Security)
            .values(
                securities.map(security => {
                    return {
                        securityId: security.getSecurityId(),
                        name: security.getName(),
                        tickerSymbol: security.getTickerSymbol(),
                        securityType: security.getSecurityType(),
                        cusip: security.getCUSIP()
                    };
                })
            )
            .onConflict('("security_id") DO NOTHING')
            .execute();

        console.log(
            `updateInstitutionAccountHoldings: Finished saving ${securities.length} securities`
        );
    }

    async function carryOverHoldingFromMostRecentDate(accounts: { id: string }[]) {
        console.log(
            'updateInstitutionAccountHoldings: Accounts not updated, copying data from previous day'
        );

        const today = dayjs()
            .endOf('day')
            .subtract(12, 'hour')
            .toDate();
        const { startOfDay } = getStartAndEndOfToday();

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
            WHERE "holding"."institution_account_id" IN (${accounts
                .map(object => `'${object.id}'`)
                .join(',')})
            `);

        const latestHoldings = (
            await holdingRepo
                .createQueryBuilder('holding')
                .where({ id: In(latestHoldingIds.map(object => object.id)) })
                .getMany()
        ).reduce((acc, holding) => ((acc[holding.institutionAccountId] = holding), acc), {});

        for await (const account of accounts) {
            if (!latestHoldings[account.id]) {
                continue;
            }

            const latestDate = dayjs(latestHoldings[account.id].date).format('YYYY-MM-DD');

            const holdings = await holdingRepo
                .createQueryBuilder('holding')
                .where('holding.institution_account_id = :accountId', { accountId: account.id })
                .andWhere("DATE_TRUNC('day', holding.date) = :latestDate", {
                    latestDate
                })
                .getMany();

            const inserts: Holding[] = [];

            holdings
                .filter(h => Boolean(h) && dayjs(h.date).isBefore(startOfDay))
                .forEach(holding => {
                    /** @todo backfill for missing dates */
                    inserts.push(
                        holdingRepo.create({
                            holdingId: holding.holdingId,
                            name: holding.name,
                            date: today,
                            marketValue: holding.marketValue,
                            units: holding.units,
                            unitPrice: holding.unitPrice,
                            priceAsOf: holding.priceAsOf,
                            assetClass: holding.assetClass,
                            assetSubclass: holding.assetSubclass,
                            securityId: holding.securityId,
                            institutionAccountId: holding.institutionAccountId,
                            provider: AccountProviderName.BAA,
                            costBasis: holding.costBasis,
                            cumulativeAverageCost: holding.cumulativeAverageCost,
                            cumulativeRealized: holding.cumulativeRealized,
                            cumulativeUnrealized: holding.cumulativeUnrealized
                        })
                    );
                });

            // TODO: Upsert
            const counts = await bulkSave<Holding>(inserts, holdingRepo, 'save', true);

            console.log(
                `updateInstitutionAccountHoldings: Finished saving ${holdings.length} holdings`
            );
        }
    }

    async function saveInstitutionAccountHoldings(holdings: any[]) {
        console.log('Storing institution account holdings');
        const accountsNotUpdated = await instAccountRepo
            .createQueryBuilder('instAccount')
            .where('update_error = true')
            .orWhere('is_manual = true')
            .select('id')
            .execute();

        // return early if no holdings available (might be due to BAA request fail)
        if (!holdings.length && !accountsNotUpdated.length) {
            console.log('returning early because holding length is 0');
            return;
        }

        // Create holding records for today
        const holdingInserts: Holding[] = [];
        // if BAA returned holdings, generate records in our system first
        if (holdings.length) {
            console.log(`attempting to save at least ${holdings.length}`);

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
                WHERE "holding"."holding_id" IN (${holdings
                    .map(h => `'${h.getHoldingId()}'`)
                    .join(',')})
                `);

            const previousHoldings = (
                await holdingRepo
                    .createQueryBuilder('holding')
                    .where({ id: In(latestHoldingIds.map(object => object.id)) })
                    .getMany()
            ).reduce((acc, holding) => ((acc[holding.holdingId] = holding), acc), {});

            const securities = (
                await securityRepo
                    .createQueryBuilder('security')
                    .where({ securityId: In(holdings.map(h => h.getSecurityId())) })
                    .getMany()
            ).reduce((acc, security) => ((acc[security.securityId] = security), acc), {});

            const institutionalAccounts = (
                await instAccountRepo
                    .createQueryBuilder('instAccount')
                    .where({ accountId: In(holdings.map(h => h.getAccountId())) })
                    .getMany()
            ).reduce(
                (acc, institutionalAccount) => (
                    (acc[institutionalAccount.accountId] = institutionalAccount), acc
                ),
                {}
            );

            for (const holding of holdings) {
                let costAndGainData: CostAndGainData;
                if (previousHoldings[holding.getHoldingId()]) {
                    costAndGainData = calculateHoldingCostAndGains(
                        holding.getUnits(),
                        holding.getUnitPrice(),
                        previousHoldings[holding.getHoldingId()] as HoldingInterface
                    );
                } else {
                    costAndGainData = {
                        costBasis: holding.getUnitPrice(),
                        cumulativeAverageCost: holding.getUnitPrice(),
                        cumulativeRealized: 0,
                        cumulativeUnrealized: 0
                    };
                }

                const units = holding.getUnits();
                const unitPrice = holding.getUnitPrice();
                let marketValue = holding.getMarketValue();

                // if market price is null and we can't calculate it, then continue to next holding
                if (!marketValue || (!units && !unitPrice)) continue;
                // calculate from other properties
                if (!marketValue) marketValue = currency.multiply(units, unitPrice, 10);

                holdingInserts.push(
                    holdingRepo.create({
                        holdingId: holding.getHoldingId(),
                        name: holding.getName(),
                        date: holding.getDate(),
                        marketValue: marketValue,
                        units: units,
                        unitPrice: unitPrice,
                        priceAsOf: holding.getPriceAsOf(),
                        assetClass: holding.getAssetClass() as HoldingAssetClass,
                        assetSubclass: holding.getAssetSubclass(),
                        securityId: securities[holding.getSecurityId()]
                            ? securities[holding.getSecurityId()].id
                            : null,
                        institutionAccountId: institutionalAccounts[holding.getAccountId()].id,
                        provider: AccountProviderName.BAA,
                        costBasis: costAndGainData.costBasis,
                        cumulativeAverageCost: costAndGainData.cumulativeAverageCost,
                        cumulativeRealized: costAndGainData.cumulativeRealized,
                        cumulativeUnrealized: costAndGainData.cumulativeUnrealized
                    })
                );
            }

            /**
             * @note we have recurring issues with missing data
             * run this synchronously will perhaps us identify
             * when the holding date/id constraint is failing us (or applied out of order)
             * */
            const counts = await bulkSave<Holding>(holdingInserts, holdingRepo, 'insert', false);

            console.log('updateInstitutionAccountHoldings: Stored new holding data');

            // TODO: Upsert
            // const result = await holdingRepo
            //     .createQueryBuilder('holding')
            //     .insert()
            //     .into(Holding)
            //     .values(holdingInserts)
            //     .onConflict('DO NOTHING')
            //     .execute();

            // console.log('Stored new holding data:\n', result);
        }

        // if account is in an error state attempt to carry over from the past
        if (accountsNotUpdated.length > 0) {
            await carryOverHoldingFromMostRecentDate(accountsNotUpdated);
        }
    }

    async function updateMarketValues() {
        // holding.date is utc
        const today = dayjs.utc().format('YYYY-MM-DD');

        // query for manual IA
        const accounts = await instAccountRepo
            .createQueryBuilder('instAccount')
            .leftJoinAndSelect('instAccount.holdings', 'holdings')
            .andWhere("DATE_TRUNC('day', holdings.date) = :today", { today })
            .getMany();

        const updates: UpdateResult[] = [];

        // update IA record synchronously to prevent a deadlock
        for await (const account of accounts) {
            if (account.holdings.length) {
                // aggregate market value for all of today's holdings
                const marketValue = account.holdings.reduce(
                    (sum, h) => currency.add(sum, h.marketValue),
                    0
                );

                updates.push(
                    await instAccountRepo.update(account.id, {
                        marketValue
                    })
                );
            }
        }

        console.log(
            `updateInstitutionAccountHoldings: updated market values for ${updates.length} holdings`
        );
    }

    /** @deprecated using plaid for this functionality */
    async function saveTenantAccountBalances() {
        try {
            const plaidClient = new PlaidClient();
            const tenantAccounts = await tenantAccountRepo
                .createQueryBuilder('tenantAccount')
                .getMany();
            const holdingInserts = [];

            for (const tenantAccount of tenantAccounts) {
                const accountData = await plaidClient.getAccount(
                    tenantAccount.accountId,
                    tenantAccount.accessToken
                );
                const balance = accountData.balances.current;
                const insert = holdingRepo.create({
                    holdingId: tenantAccount.accountId,
                    name: 'CASH BALANCE',
                    date: new Date(),
                    marketValue: balance,
                    units: balance,
                    unitPrice: 1,
                    assetClass: HoldingAssetClass.CASH,
                    tenantAccountId: tenantAccount.id,
                    provider: AccountProviderName.PLAID,
                    costBasis: 1,
                    cumulativeAverageCost: 1,
                    cumulativeRealized: 0,
                    cumulativeUnrealized: 0
                });
                holdingInserts.push(insert);
            }
            await holdingRepo.save(holdingInserts);
            console.log('Successfully stored TenantAccount balance holdings');
        } catch (error) {
            console.log(`Error storing TenantAccount balance holdings: ${error.message}`);
        }
    }

    try {
        // Get accounts that are linked to investments
        let accountIds = [];
        if (institutionAccountId) {
            const account = await instAccountRepo.findOne(institutionAccountId);
            accountIds = [account.accountId];
        } else {
            const accountsWithInvestments = await instAccountRepo
                .createQueryBuilder('instAccount')
                .where('instAccount.isManual = false')
                .getMany();
            accountIds = accountsWithInvestments.map(account => {
                return account.accountId;
            });
        }

        // Get holding and securities data from BAA
        let holdings = [];
        let securities = [];
        try {
            const res = await baaFacade.getHoldingsAndSecuritiesForAccounts(
                baaUser.loginName,
                crypt.decrypt(baaUser.loginPass),
                baaUser.financialProfileId,
                accountIds
            );
            holdings = res.holdings;
            securities = res.securities;
        } catch (error) {
            console.error(
                `unable to fetch holdings ands securities for financial provider: ${baaUser.financialProfileId}.\n`,
                `setting "updateError" flag for ${accountIds.length} accounts.\n`,
                error
            );
            // turn off updateError flag so holdings get carried over
            await instAccountRepo
                .createQueryBuilder()
                .update()
                .set({ updateError: true })
                .where({ accountId: In(accountIds) })
                .execute();
        }

        await saveSecurities(securities);
        await saveInstitutionAccountHoldings(holdings);
        await updateMarketValues();

        // Not currently using Plaid for this
        // await saveTenantAccountBalances();
    } catch (error) {
        console.log(
            `updateInstitutionAccountHoldings: Error updating holdings data: ${error.message}`
        );
    }
    return;
}

export async function updateSharedHoldings() {
    const connection = await getOrCreateConnection();
    const poolHoldingRepo = connection.getCustomRepository(PoolInvestmentHoldingRepository);
    const investmentRepo = connection.getRepository(Investment);
    console.log('updatePoolHoldings: Started');

    async function savePoolHoldings() {
        // Get pool investments
        const poolInvestments = await investmentRepo
            .createQueryBuilder('investment')
            .leftJoinAndSelect('investment.fundAllocations', 'fundAllocations')
            .where('investment.investmentType = :investmentType', {
                investmentType: InvestmentType.POOL
            })
            .getMany();
        const poolInvestmentIds = poolInvestments.map(i => `'${i.id}'`).join(',');

        // return early if we can't find investments
        if (!poolInvestmentIds.length) {
            console.error("updateHoldings: ERROR: no 'poolInvestmentIds' in 'savePoolHoldings'");
            return;
        }

        const unitPrices = await poolInvestmentUtil.getCurrentUnitPrices();

        // Create holding records for pools for today
        const latestHoldingIds = await poolHoldingRepo.query(`
            SELECT "pool_investment_holding"."id"
            FROM "pool_investment_holding"
            JOIN "fund_investment" "fi"
                ON "pool_investment_holding"."fund_investment_id" = "fi"."id"
            JOIN (
                SELECT "fund_investment_id", MAX("date") AS "date"
                FROM "pool_investment_holding"
                GROUP BY "fund_investment_id"
            ) "latest_holding"
                ON "pool_investment_holding"."date" = "latest_holding"."date"
                AND "pool_investment_holding"."fund_investment_id" = "latest_holding"."fund_investment_id"
                WHERE "fi"."investment_id" IN (${poolInvestmentIds});
        `);
        const latestHoldings = await poolHoldingRepo.findByIds(
            latestHoldingIds.map(result => result['id']),
            { relations: ['fundInvestment'] }
        );

        const startOfToday = dayjs()
            .startOf('day')
            .toDate();

        const inserts: PoolInvestmentHolding[] = [];
        const updates: Promise<UpdateResult>[] = [];

       for (const holding of latestHoldings) {
            const currentUnitPrice = unitPrices[holding.fundInvestment.investmentId].price;
            const currentUnitPriceAsOf = unitPrices[holding.fundInvestment.investmentId].priceAsOf;
            const costAndGainData = calculateHoldingCostAndGains(
                holding.units,
                currentUnitPrice,
                holding
            );
            const marketValue = currency.multiply(holding.units, currentUnitPrice, 10);
            if (holding.date < startOfToday) {
                inserts.push(
                    poolHoldingRepo.create({
                        date: new Date(),
                        units: holding.units,
                        marketValue: marketValue,
                        unitPrice: currentUnitPrice,
                        priceAsOf: currentUnitPriceAsOf,
                        fundInvestmentId: holding.fundInvestmentId,
                        costBasis: costAndGainData.costBasis,
                        cumulativeAverageCost: costAndGainData.cumulativeAverageCost,
                        cumulativeRealized: costAndGainData.cumulativeRealized,
                        cumulativeUnrealized: costAndGainData.cumulativeUnrealized,
                        payable: holding.payable,
                        receivable: holding.receivable
                    })
                );
            } else {
                updates.push(
                    poolHoldingRepo.update(holding.id, {
                        units: holding.units,
                        marketValue: marketValue,
                        date: new Date(),
                        unitPrice: currentUnitPrice,
                        priceAsOf: currentUnitPriceAsOf,
                        cumulativeAverageCost: costAndGainData.cumulativeAverageCost,
                        cumulativeRealized: costAndGainData.cumulativeRealized,
                        cumulativeUnrealized: costAndGainData.cumulativeUnrealized
                    })
                );
            }
        }

        await Promise.all([
            bulkSave<PoolInvestmentHolding>(inserts, poolHoldingRepo, 'save', true),
            updates
        ]);

        console.log('updatePoolHoldings: Stored pool holdings');
    }

    async function saveCashHoldings() {
        console.log('updatePoolHoldings: Storing shared cash holdings');
        // Get cash investments
        const investments = await investmentRepo
            .createQueryBuilder('investment')
            .where('investment.investmentType IN (:...types)', 
                { types: [InvestmentType.CONTRIBUTION_CASH, InvestmentType.GRANT_CASH] }
            )
            .getMany();

        // Create holding records for pools for today
        const latestHoldingIds = await poolHoldingRepo.query(`
            SELECT "pool_investment_holding"."id"
            FROM "pool_investment_holding"
            JOIN "fund_investment" "fi"
                ON "pool_investment_holding"."fund_investment_id" = "fi"."id"
            JOIN (
                SELECT "fund_investment_id", MAX("date") AS "date"
                FROM "pool_investment_holding"
                GROUP BY "fund_investment_id"
            ) "latest_holding"
                ON "pool_investment_holding"."date" = "latest_holding"."date"
                AND "pool_investment_holding"."fund_investment_id" = "latest_holding"."fund_investment_id"
            WHERE "fi"."investment_id" IN (
                ${investments.map(i => `'${i.id}'`).join(',')}
            );
        `);

        const latestHoldings = await poolHoldingRepo.findByIds(
            latestHoldingIds.map(result => result['id']),
            { relations: ['fundInvestment'] }
        );
        const startOfToday = dayjs()
            .startOf('day')
            .toDate();

        const poolHoldingInserts = latestHoldings
            .filter(holding => holding.date < startOfToday) // If holding is current, no need to create new one
            .map(holding => {
                return poolHoldingRepo.create({
                    date: new Date(),
                    priceAsOf: new Date(),
                    units: holding.units,
                    marketValue: holding.marketValue,
                    unitPrice: holding.unitPrice,
                    fundInvestmentId: holding.fundInvestmentId,
                    costBasis: holding.costBasis,
                    cumulativeAverageCost: holding.cumulativeAverageCost,
                    cumulativeRealized: holding.cumulativeRealized,
                    cumulativeUnrealized: holding.cumulativeUnrealized,
                    payable: holding.payable,
                    receivable: holding.receivable
                });
            });

        await bulkSave<PoolInvestmentHolding>(
            poolHoldingInserts,
            poolHoldingRepo,
            'save',
            true
        );
        console.log('updateSharedHoldings: Stored shared cash and stock holdings');
    }

    await savePoolHoldings();
    await saveCashHoldings();

    console.log('updatePoolHoldings: Finished');
}
