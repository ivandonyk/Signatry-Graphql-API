import { getOrCreateConnection } from '../../typeorm';
import {
    FundTransaction,
    FundTransactionDetail,
    TransactionEvent,
    TransactionType
} from '../../models';
import { TransactionTypeValue } from '../../models/TransactionType';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const ftDetailRepo = connection.getRepository(FundTransactionDetail);
    const ftEventRepo = connection.getRepository(TransactionEvent);

    const transferOutType = await connection.getRepository(TransactionType).findOne({
        name: TransactionTypeValue.TRANSFER_OUT
    });
    const transferInType = await connection.getRepository(TransactionType).findOne({
        name: TransactionTypeValue.TRANSFER_IN
    });

    const badFundTransDeets = await ftDetailRepo
        .createQueryBuilder('entity')
        .leftJoin('entity.fundTransaction', 'ft')
        .where('ft.transactionTypeId = :transferOutType', { transferOutType: transferOutType.id })
        .orWhere('ft.transactionTypeId = :transferInType', { transferInType: transferInType.id })
        .getMany();

    const badEvents = await ftEventRepo
        .createQueryBuilder('entity')
        .leftJoin('entity.fundTransaction', 'ft')
        .where('ft.transactionTypeId = :transferOutType', { transferOutType: transferOutType.id })
        .orWhere('ft.transactionTypeId = :transferInType', { transferInType: transferInType.id })
        .getMany();

    console.log(badEvents.length);

    const deletedBadTransDeets = await ftDetailRepo.remove(badFundTransDeets);
    const deletedBadEvents = await ftEventRepo.remove(badEvents);

    const deletedTransactions = await connection
        .createQueryBuilder()
        .delete()
        .from(FundTransaction)
        .where('transactionTypeId = :transferInTypeId ', {
            transferInTypeId: transferInType.id
        })
        .orWhere('transactionTypeId = :transferOutTypeId ', {
            transferOutTypeId: transferOutType.id
        })
        .execute();

    console.log(deletedBadTransDeets.length);
    console.log(deletedBadEvents.length);
    console.log(deletedTransactions);

    process.exit(0);
})();
