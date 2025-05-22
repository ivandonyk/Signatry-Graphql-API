import {
    ByAllAccountsUser,
    Holding,
    InstitutionAccount,
    InstitutionAccountTransaction,
    TenantAccount
} from '../../models';
import { InstitutionAccountTransactionType } from '../../models/InstitutionAccountTransaction';
import { AccountProviderName } from '../../models/ProviderAccountData';
import { BAAFacade } from '../../morningstar/byallaccounts/facade';
import { PlaidClient } from '../../plaid/client';
import { getOrCreateConnection } from '../../typeorm';
import { dayjs } from '../../utilities/datetime';
import { In } from 'typeorm';
const Cryptr = require('cryptr');

export async function importTransactions(start?: Date, end?: Date, institutionAcountId?: string) {
    console.log('Importing transaction data');
    const results = {
        success: [],
        fail: []
    };

    let connection;
    try {
        connection = await getOrCreateConnection();
    } catch (error) {
        console.log('importTransactions: Unable to create connection');
        results.fail.push('importTransactions: Unable to create connection');
        return results;
    }

    const startDate =
        start ||
        dayjs()
            .subtract(15, 'day')
            .startOf('day')
            .toDate();
    const endDate =
        end ||
        dayjs()
            .endOf('day')
            .toDate();
    const accountTransactionRepo = connection.getRepository(InstitutionAccountTransaction);

    async function importBAATransactions(
        startDate: Date,
        endDate: Date,
        institutionAccountId?: string
    ) {
        const baaFacade = new BAAFacade();
        const { CRYPT_KEY } = process.env;
        const crypt = new Cryptr(CRYPT_KEY);

        const instAccountRepo = connection.getRepository(InstitutionAccount);
        const holdingRepo = connection.getRepository(Holding);

        const baaUser = await connection.getRepository(ByAllAccountsUser).findOne();
        try {
            let accountIds = [] as string[];

            if (institutionAcountId) {
                const instAccount = await instAccountRepo.findOne(institutionAcountId);
                if (!instAccount) {
                    return;
                }
                accountIds = [instAccount.accountId];
            } else {
                const accountsWithInvestments = await instAccountRepo
                    .createQueryBuilder('instAccount')
                    .innerJoinAndSelect('instAccount.investment', 'investment')
                    .where('instAccount.isManual = false')
                    .select('instAccount.accountId')
                    .execute();
                const accountsWithoutInvestments = await instAccountRepo
                    .createQueryBuilder('instAccount')
                    .where('instAccount.isSweepAccount = true')
                    .select('instAccount.accountId')
                    .execute();
                const accounts = [...accountsWithInvestments, ...accountsWithoutInvestments];
                accountIds = accounts.map(instAccount => instAccount.instAccount_account_id);
            }

            const transactions = await baaFacade.getTransactionsForAccounts(
                baaUser.loginName,
                crypt.decrypt(baaUser.loginPass),
                baaUser.financialProfileId,
                accountIds,
                startDate,
                endDate
            );

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
            WHERE "holding"."holding_id" IN (${transactions
                .map(transaction => `'${transaction.getHoldingId()}'`)
                .join(',')})
            `);

            const latestHoldings = (
                await holdingRepo
                    .createQueryBuilder('holding')
                    .where({ id: In(latestHoldingIds.map(object => object.id)) })
                    .getMany()
            ).reduce((acc, holding) => ((acc[holding.institutionAccountId] = holding), acc), {});

            const institutionalAccounts = (
                await instAccountRepo
                    .createQueryBuilder('instAccount')
                    .where({
                        accountId: In(transactions.map(transaction => transaction.getAccountId()))
                    })
                    .getMany()
            ).reduce(
                (acc, institutionalAccount) => (
                    (acc[institutionalAccount.accountId] = institutionalAccount), acc
                ),
                {}
            );

            const transactionInserts: InstitutionAccountTransaction[] = [];
            for (const transaction of transactions) {
                transactionInserts.push(
                    accountTransactionRepo.create({
                        transactionId: transaction.getTransactionId(),
                        holdingId: latestHoldings[transaction.getHoldingId()]
                            ? latestHoldings[transaction.getHoldingId()].id
                            : null,
                        institutionAccountId: institutionalAccounts[transaction.getAccountId()].id,
                        amount: transaction.getAmount(),
                        name: transaction.getName(),
                        feeAmount: transaction.getFeeAmount(),
                        transactionType: transaction.getTransactionType() as InstitutionAccountTransactionType,
                        postedOn: transaction.getPostedOn(),
                        units: transaction.getUnits(),
                        unitPrice: transaction.getUnitPrice(),
                        provider: AccountProviderName.BAA,
                        transactionName: transaction.getTransactionName(),
                        creationDate: transaction.getCreationDate(),
                        flowAmount: transaction.getFlowAmount(),
                        flowUnits: transaction.getFlowUnits(),
                        executionDate: transaction.getExecutionDate()
                    })
                );
            }

            // TODO: Upsert
            for (const insert of transactionInserts) {
                try {
                    await accountTransactionRepo
                        .createQueryBuilder('institutionAccountTransaction')
                        .insert()
                        .into(InstitutionAccountTransaction)
                        .values(insert)
                        .onConflict('("transaction_id") DO NOTHING')
                        .execute();
                } catch (error) {
                    console.log(`Could not save transaction ${insert.name}: ${error.message}`);
                }
            }
            results.success.push(
                'importTransactions: Successfully stored new transactions from ByAllAccounts'
            );
        } catch (error) {
            results.fail.push(
                `importTransactions: Unable to store new ByAllAccounts transactions: ${error.message}`
            );
        }
    }

    async function importPlaidTransactions() {
        try {
            const plaidClient = new PlaidClient();
            const tenantAccountRepo = connection.getRepository(TenantAccount);
            const tenantAccounts = await tenantAccountRepo
                .createQueryBuilder('tenantAccount')
                .getMany();
            const transactionInserts = [];

            for (const tenantAccount of tenantAccounts) {
                const transactions = await plaidClient.getTransactionsForAccount(
                    tenantAccount.accountId,
                    tenantAccount.accessToken,
                    startDate,
                    endDate
                );
                const inserts = transactions.map(transaction => {
                    return accountTransactionRepo.create({
                        transactionId: transaction.transaction_id,
                        tenantAccountId: tenantAccount.id,
                        name: transaction.name,
                        amount: transaction.amount,
                        transactionType:
                            transaction.amount > 0
                                ? InstitutionAccountTransactionType.CREDIT
                                : InstitutionAccountTransactionType.DEBIT,
                        postedOn: transaction.date,
                        provider: AccountProviderName.PLAID
                    });
                });
                transactionInserts.push(...inserts);
            }
            for (const insert of transactionInserts) {
                try {
                    await accountTransactionRepo.save(insert);
                } catch (error) {
                    console.log(`Could not save transaction ${insert.name}: ${error.message}`);
                }
            }
            console.log('Successfully stored new transactions from Plaid');
        } catch (error) {
            console.log('Error importing Plaid transactions');
            console.log(error);
        }
    }

    return await importBAATransactions(startDate, endDate, institutionAcountId);
    //await importPlaidTransactions();
}
