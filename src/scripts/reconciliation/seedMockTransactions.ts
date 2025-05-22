import { getOrCreateConnection } from '../../typeorm';
import { Batch, InstitutionAccountTransaction } from '../../models';
import { BatchStatusValue } from '../../models/Batch';
import { AccountProviderName } from '../../models/ProviderAccountData';
import { InstitutionAccountTransactionType } from '../../models/InstitutionAccountTransaction';
import { dayjs } from '../../utilities/datetime';

async function seedMockTransactions() {
    console.log('Creating mock transactions to reconcile against');
    const connection = await getOrCreateConnection();
    const batchRepo = connection.getRepository(Batch);
    const transactionRepo = connection.getRepository(InstitutionAccountTransaction);

    const existingMockTransactions = await transactionRepo
        .createQueryBuilder('transaction')
        .where('name LIKE :mockName', { mockName: 'MOCK%' })
        .getMany();
    const mockTransactionIds = existingMockTransactions.map(r => r.transactionId);
    const sourceGLAccountBatches = await batchRepo
        .createQueryBuilder('batch')
        .innerJoinAndSelect('batch.sourceGLAccount', 'sourceGLAccount')
        .innerJoinAndSelect('sourceGLAccount.institutionAccount', 'institutionAccount')
        .where('batch.status = :batchStatus', { batchStatus: BatchStatusValue.PENDING })
        .getMany();

    const destinationGLAccountBatches = await batchRepo
        .createQueryBuilder('batch')
        .innerJoinAndSelect('batch.destinationGLAccount', 'destinationGLAccount')
        .innerJoinAndSelect('destinationGLAccount.institutionAccount', 'institutionAccount')
        .where('batch.status = :batchStatus', { batchStatus: BatchStatusValue.PENDING })
        .getMany();

    const mockTransactions = [];

    for (const sourceGLAccountBatch of sourceGLAccountBatches) {
        console.log(`Creating transaction to match ${sourceGLAccountBatch.batchCode}`);
        const transactionId = `MOCK-sourceBatch-${sourceGLAccountBatch.batchCode}`;
        if (!mockTransactionIds.includes(transactionId)) {
            mockTransactions.push(
                transactionRepo.create({
                    institutionAccountId:
                        sourceGLAccountBatch.sourceGLAccount.institutionAccount.id,
                    amount: -1 * Math.abs(sourceGLAccountBatch.amount),
                    transactionId: transactionId,
                    name: transactionId,
                    transactionType: InstitutionAccountTransactionType.TRANSFER,
                    provider: AccountProviderName.BAA,
                    postedOn: sourceGLAccountBatch.createdOn,
                    createdOn: sourceGLAccountBatch.createdOn
                })
            );
        }
    }

    for (const destinationGLAccountBatch of destinationGLAccountBatches) {
        console.log(`Creating transaction to match ${destinationGLAccountBatch.batchCode}`);
        const transactionId = `MOCK-destBatch-${destinationGLAccountBatch.batchCode}`;
        if (!mockTransactionIds.includes(transactionId)) {
            mockTransactions.push(
                transactionRepo.create({
                    institutionAccountId:
                        destinationGLAccountBatch.destinationGLAccount.institutionAccount.id,
                    amount: Math.abs(destinationGLAccountBatch.amount),
                    transactionId: transactionId,
                    name: transactionId,
                    transactionType: InstitutionAccountTransactionType.TRANSFER,
                    provider: AccountProviderName.BAA,
                    postedOn: destinationGLAccountBatch.createdOn,
                    createdOn: destinationGLAccountBatch.createdOn
                })
            );
        }
    }

    await transactionRepo.save(mockTransactions);
    console.log('Mock transactions created');
    process.exit();
}

seedMockTransactions();
