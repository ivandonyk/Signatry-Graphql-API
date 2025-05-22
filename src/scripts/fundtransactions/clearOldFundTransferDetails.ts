import { getOrCreateConnection } from '../../typeorm';
import {
    FundTransaction,
    FundTransactionDetail,
    TransactionDetailType,
    TransactionStatus,
    TransactionType
} from '../../models';
import { TransactionDetailTypeName } from '../../models/TransactionDetailType';
import { TransactionTypeValue } from '../../models/TransactionType';
import { TransactionStatusValue } from '../../models/TransactionStatus';

(async () => {
    const connection = await getOrCreateConnection({ logging: false });
    const ftRepo = connection.getRepository(FundTransaction);
    const ftDetailRepo = connection.getRepository(FundTransactionDetail);

    const divestmentCashTransactionDetailType = await connection
        .getRepository(TransactionDetailType)
        .findOne({
            name: TransactionDetailTypeName.GRANT_DIVESTMENT_CASH
        });

    const transferDetailType = await connection.getRepository(TransactionDetailType).findOne({
        name: TransactionDetailTypeName.TRANSFER_OUT
    });

    const paymentCashTransactionDetailType = await connection
        .getRepository(TransactionDetailType)
        .findOne({
            name: TransactionDetailTypeName.CASH_OUT
        });

    const transferOutType = await connection.getRepository(TransactionType).findOne({
        name: TransactionTypeValue.TRANSFER_OUT
    });
    const transferInType = await connection.getRepository(TransactionType).findOne({
        name: TransactionTypeValue.TRANSFER_IN
    });

    const transferStatusSubmitted = await connection.getRepository(TransactionStatus).findOne({
        name: TransactionStatusValue.SUBMITTED
    });

    const badFundTransDeets = await ftDetailRepo
        .createQueryBuilder('entity')
        .leftJoin('entity.fundTransaction', 'ft')
        .where('ft.transactionTypeId = :transferOutType', { transferOutType: transferOutType.id })
        .andWhere('entity.transactionDetailTypeId in (:...details)', {
            details: [
                divestmentCashTransactionDetailType.id,
                transferDetailType.id,
                paymentCashTransactionDetailType.id
            ]
        })
        .orWhere('ft.transactionTypeId = :transferInType', { transferInType: transferInType.id })
        .orWhere('ft.transactoiinStatusId = :transferOutStatus', {
            transferOutStatus: transferStatusSubmitted.id
        })
        .getMany();

    const deletedBadTransDeets = await ftDetailRepo.remove(badFundTransDeets);
    const deletedTransferIns = await ftRepo.delete({ transactionTypeId: transferInType.id });

    console.log(deletedBadTransDeets.length);
    console.log(deletedTransferIns);

    process.exit(0);
})();
