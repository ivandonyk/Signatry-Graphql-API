import { getOrCreateConnection } from '../../typeorm';
import { FundTransaction, TransactionType } from '../../models';
import { TransactionTypeValue } from '../../models/TransactionType';

(async () => {
    const connection = await getOrCreateConnection({ logging: false });
    const ftRepo = connection.getRepository(FundTransaction);

    const transferOutType = await connection.getRepository(TransactionType).findOne({
        name: TransactionTypeValue.TRANSFER_OUT
    });

    const badFundTransResp = await ftRepo
        .createQueryBuilder('entity')
        .leftJoinAndSelect('entity.transactionDetails', 'ftd')
        .where('entity.transactionTypeId = :transferOutType', {
            transferOutType: transferOutType.id
        })
        .getMany();

    const badFundTrans = badFundTransResp
        .filter(ft => ft.transactionDetails.length === 0)
        .map(ft => ft.id);

    if (badFundTrans.length) {
        const deletes = await ftRepo.delete(badFundTrans);
        console.log(deletes);
    }

    console.log(`${badFundTrans.length} rows affected`);

    process.exit(0);
})();
