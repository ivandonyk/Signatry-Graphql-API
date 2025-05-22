import {
    Holding,
    InstitutionAccount,
    InstitutionAccountTransaction,
    Investment
} from '../../models';
import { BAAFacade } from '../../morningstar/byallaccounts/facade';
import { getOrCreateConnection } from '../../typeorm';

const { BYALLACCOUNTS_USER, BYALLACCOUNTS_PASS } = process.env;

export async function importInstitutionAccounts(manager = null) {
    console.log('Importing institution account records');
    const facade = new BAAFacade();
    manager = manager ?? (await getOrCreateConnection()).manager;
    const instAccountRepo = manager.getRepository(InstitutionAccount);
    const investmentRepo = manager.getRepository(Investment);

    try {
        const accounts = await facade.getAllAccounts(BYALLACCOUNTS_USER, BYALLACCOUNTS_PASS);
        for (const account of accounts) {
            try {
                const instAccounts = await instAccountRepo.find({
                    accountNumber: account.getAccountNumber()
                });
                if (instAccounts.length == 0) {
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
                    console.log(`Inserted ${account.getName()}`);
                } else {
                    let instAccount = instAccounts[0];
                    // Check for duplicates and remove
                    if (instAccounts.length > 1) {
                        instAccount = instAccounts.find(
                            ia => ia.accountId === account.getAccountId()
                        );
                        console.log(`Cleaning up data for ${instAccount.name}`);
                        const duplicates = instAccounts.filter(
                            ia => ia.accountId !== account.getAccountId()
                        );
                        const duplicateIds = duplicates.map(ia => ia.id);
                        // Look for investments, transactions, and holdings
                        // that may have outdated InstitutionAccount attached
                        await investmentRepo
                            .createQueryBuilder('investment')
                            .update()
                            .set({ institutionAccountId: instAccount.id })
                            .where('institutionAccountId IN (:...duplicateIds)', {
                                duplicateIds: duplicateIds
                            })
                            .execute();
                        await manager
                            .getRepository(InstitutionAccountTransaction)
                            .createQueryBuilder('institutionAccountTransaction')
                            .delete()
                            .where('institutionAccountId IN (:...duplicateIds)', {
                                duplicateIds: duplicateIds
                            })
                            .execute();
                        await manager
                            .getRepository(Holding)
                            .createQueryBuilder('holding')
                            .delete()
                            .where('institutionAccountId IN (:...duplicateIds)', {
                                duplicateIds: duplicateIds
                            })
                            .execute();

                        await instAccountRepo
                            .createQueryBuilder('instAccount')
                            .delete()
                            .where('id IN (:...duplicateIds)', {
                                duplicateIds: duplicateIds
                            })
                            .execute();
                    }
                    const lastUpdated = account.getLastUpdated();
                    await instAccountRepo.update(instAccount.id, {
                        marketValue: account.getMarketValue(),
                        ...(lastUpdated !== null
                            ? { lastUpdated, updateError: false }
                            : { updateError: true }), // indicate whether the account can't be updated in BAA without wiping out the existing date
                        custodianName: account.getCustodianName(),
                        displayName: account.getName()
                    });
                }
            } catch (error) {
                console.log(
                    `ERROR: Unable to store account ${account.getName()} - ${error.message}`
                );
            }
        }
        console.log('Imported all institution accounts.');
    } catch (error) {
        console.log('Unable to update institution accounts');
        return;
    }
}
