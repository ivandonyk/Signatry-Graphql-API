import { getOrCreateConnection } from '../../typeorm';
import { InstitutionAccountTransaction, GLAccountReconciliation } from '../../models';

export async function clearUnmatchedTransactions() {
    console.log('Clearing transactions from reconciliations');

    const connection = await getOrCreateConnection();
    const transactionRepo = connection.getRepository(InstitutionAccountTransaction);
    const reconciliationRepo = connection.getRepository(GLAccountReconciliation);

    // Associate transactions to an old reconciliation so they are removed from any current ones
    const oldReconciliation = await reconciliationRepo
        .createQueryBuilder('reconciliation')
        .orderBy('reconciliation.createdOn', 'ASC')
        .getOne();

    await transactionRepo
        .createQueryBuilder('transaction')
        .update()
        .set({ glAccountReconciliationId: oldReconciliation.id })
        .where('glAccountReconciliationId IS NULL')
        .execute();
}
clearUnmatchedTransactions();
