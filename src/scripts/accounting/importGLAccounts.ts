import { getOrCreateConnection } from '../../typeorm';
import { Connection } from 'typeorm';
import { GLAccount, Tenant } from '../../models';
import { AccountingFacade } from '../../accounting';

export async function importGLAccounts() {
    const connection = await getOrCreateConnection();
    console.log('Finding new GL Accounts to import');
    const accounting = await new AccountingFacade();
    const tenant = await connection.getRepository(Tenant).findOne();
    const repo = connection.getRepository(GLAccount);
    const existingAccounts = await repo.createQueryBuilder('glAccount').getMany();
    const existingIds = existingAccounts.map(a => a.accountNumber);
    const accounts = await accounting.getAllAccounts();
    const inserts = accounts
        .filter(account => !existingIds.includes(account.getAccountNumber()))
        .map(account => {
            return {
                accountNumber: account.getAccountNumber(),
                title: account.getTitle(),
                tenantId: tenant.id
            };
        });
    if (inserts.length > 0) {
        await repo.insert(inserts);
        console.log(`Inserted ${inserts.length} new GL Accounts`);
    } else {
        console.log('GL Accounts already up to date');
    }
    return;
}
