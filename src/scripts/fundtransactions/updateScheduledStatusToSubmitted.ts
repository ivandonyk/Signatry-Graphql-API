import { getOrCreateConnection } from '../../typeorm';
import { FundTransaction, TransactionStatus } from '../../models';
import { TransactionStatusValue } from '../../models/TransactionStatus';

(async () => {
    const connection = await getOrCreateConnection({ logging: false });
    const ftRepo = connection.getRepository(FundTransaction);

    const scheduledStatus = await connection.getRepository(TransactionStatus).findOne({
        name: TransactionStatusValue.SCHEDULED
    });

    const submittedStatus = await connection.getRepository(TransactionStatus).findOne({
        name: TransactionStatusValue.SUBMITTED
    });

    const scheduled = await ftRepo.update(
        { transactionStatus: scheduledStatus },
        { transactionStatus: submittedStatus }
    );

    return;
})();
