import { Connection, UpdateResult } from 'typeorm';
import { InstitutionAccount } from '../../models';
import { BAAFacade } from '../../morningstar/byallaccounts/facade';
import { getOrCreateConnection } from '../../typeorm';
import { bulkSave } from '../../utilities/bulkSave';

const { BYALLACCOUNTS_USER, BYALLACCOUNTS_PASS } = process.env;

export async function updateInstitutionAccounts(dbConnection?: Connection) {
    console.log('Updating institution account records');

    const facade = new BAAFacade();
    const connection = dbConnection ? dbConnection : await getOrCreateConnection();
    const instAccountRepo = connection.getRepository(InstitutionAccount);

    try {
        // fetch from BAA
        const accounts = await facade.getAllAccounts(BYALLACCOUNTS_USER, BYALLACCOUNTS_PASS);
        // fetch existing accounts from DB
        const existingAccounts = await instAccountRepo
            .createQueryBuilder('instAccount')
            .where('instAccount.accountId IN (:...ids)', {
                ids: accounts.map(account => account.getAccountId())
            })
            .getMany();

        // update synchronously to prevent deadlocks
        for await (const account of accounts) {
            const instAccount = existingAccounts.find(existingAccount => {
                return existingAccount.accountId === account.getAccountId();
            });

            if (typeof instAccount === 'undefined') {
                await instAccountRepo.insert({
                    accountId: account.getAccountId(),
                    name: account.getName(),
                    displayName: account.getName(),
                    financialProfileId: account.getFinancialProfileId(),
                    accountNumber: account.getAccountNumber(),
                    accountType: account.getAccountType(),
                    marketValue: account.getMarketValue(),
                    lastUpdated: account.getLastUpdated(),
                    custodianName: account.getCustodianName()
                });
            } else {
                /** @note only update dates and error status. marketValue is updated in `updateHoldings` cron */
                const lastUpdated = account.getLastUpdated();
                await instAccountRepo.update(instAccount.id, {
                    // indicate that the record is out of date, without wiping out the previous date with null value
                    lastUpdated: lastUpdated === null ? instAccount.lastUpdated : lastUpdated,
                    updateError: lastUpdated === null
                });
            }
        }

        return;
    } catch (error) {
        console.log('Unable to update institution accounts\n', error);
        return;
    }
}
