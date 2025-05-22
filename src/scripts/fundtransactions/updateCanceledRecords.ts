import { getOrCreateConnection } from '../../typeorm';
import { FundTransactionDetail } from '../../models';
import { BatchStatusValue } from '../../models/Batch';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const recordsNeedingAmendment = await connection
        .getRepository(FundTransactionDetail)
        .createQueryBuilder('ftd')
        .leftJoinAndSelect('ftd.batch', 'batch')
        .where('batch.status = :status', { status: BatchStatusValue.CANCELED })
        .getMany();

    if (recordsNeedingAmendment.length) {
        await connection
            .createQueryBuilder()
            .update(FundTransactionDetail)
            .set({ batchId: null })
            .where('id IN (:...ids)', { ids: recordsNeedingAmendment.map(r => r.id) })
            .execute();
    }

    process.exit(0);
})();
