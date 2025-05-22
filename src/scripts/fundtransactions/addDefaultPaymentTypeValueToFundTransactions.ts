import { getOrCreateConnection } from '../../typeorm';
import { FundTransaction, TransactionType } from '../../models';
import { TransactionTypeValue } from '../../models/TransactionType';
import { DetailPaymentType } from '../../models/FundTransactionDetail';

(async () => {
    const connection = await getOrCreateConnection({ logging: false });
    const ftRepo = connection.getRepository(FundTransaction);

    const contribType = await connection.getRepository(TransactionType).findOne({
        name: TransactionTypeValue.CONTRIBUTION
    });

    const badFundTransResp = await ftRepo
        .createQueryBuilder('entity')
        .where('entity.transactionTypeId = :transferType', {
            transferType: contribType.id
        })
        .andWhere('entity.metadata::JSONB @> :val', {
            val: { paymentDetails: { paymentType: null } }
        })
        .getMany();

    for (const ft of badFundTransResp) {
        await connection
            .createQueryBuilder()
            .update(FundTransaction)
            .set({
                metadata: { ...ft.metadata, paymentDetails: { paymentType: DetailPaymentType.ACH } }
            })
            .where('id = :id', { id: ft.id })
            .execute();
    }

    console.log(badFundTransResp.length);

    process.exit(0);
})();
