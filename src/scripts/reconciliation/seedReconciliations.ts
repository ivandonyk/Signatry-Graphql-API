import { getOrCreateConnection } from '../../typeorm';
import { Holding, GLAccount, GLAccountReconciliation } from '../../models';
import { dayjs, parseFromFormat } from '../../utilities/datetime';

export async function seedReconciliations(overwriteAll = false) {
    console.log('Creating reconciliations for accounts');

    const connection = await getOrCreateConnection();
    const reconciliationRepo = connection.getRepository(GLAccountReconciliation);
    const holdingRepo = connection.getRepository(Holding);
    const glAccountRepo = connection.getRepository(GLAccount);

    // Get GL accounts that are associated to an investment but don't have a reconciliation
    let accounts = await glAccountRepo
        .createQueryBuilder('glAccount')
        .innerJoinAndSelect('glAccount.investment', 'investment')
        .innerJoinAndSelect('investment.institutionAccount', 'institutionAccount')
        .leftJoinAndSelect('institutionAccount.holdings', 'holdings')
        .where('institutionAccount.isSweepAccount = false')
        .getMany();

    const reconciliations = [];
    const datePreviousReconciled = dayjs()
        .subtract(1, 'day')
        .toDate();
    // Close other active reconciliations to avoid dupilcates
    if (overwriteAll) {
        await reconciliationRepo
            .createQueryBuilder('reconciliation')
            .update()
            .set({ dateReconciled: datePreviousReconciled })
            .where('dateReconciled IS NULL')
            .execute();
        console.log('Outstanding reconciliations closed.');
    } else {
        const activeReconciliations = await reconciliationRepo
            .createQueryBuilder('reconciliation')
            .where('reconciliation.dateReconciled IS NULL')
            .getMany();
        const activeReconciliationIds = activeReconciliations.map(r => r.glAccountId);
        accounts = accounts.filter(a => !activeReconciliationIds.includes(a.id));
    }
    for (const account of accounts) {
        /*
        const earliestHolding = account.institutionAccount.holdings
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .pop();
        const datePreviousReconciled = earliestHolding ? earliestHolding.date : new Date();
         */
        console.log(`Creating reconciliaton for ${account.title}`);
        reconciliations.push(
            reconciliationRepo.create({
                glAccountId: account.id,
                datePreviousReconciled: datePreviousReconciled,
                balanceOpen: account.investment.institutionAccount.marketValue
            })
        );
    }
    console.log('Reconciliations created.');

    return;
}
//seedReconciliations();
