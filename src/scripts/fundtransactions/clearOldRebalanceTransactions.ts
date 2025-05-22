import { getOrCreateConnection } from '../../typeorm';
import { FundTransaction, TransactionType } from '../../models';
import { TransactionTypeValue } from '../../models/TransactionType';

(async () => {
    const connection = await getOrCreateConnection({ logging: false });
    const ftRepo = connection.getRepository(FundTransaction);

    const rebalanceType = await connection.getRepository(TransactionType).findOne({
        name: TransactionTypeValue.REBALANCE
    });

    const badFundTransResp = await ftRepo
        .createQueryBuilder('entity')
        .leftJoinAndSelect('entity.transactionDetails', 'ftd')
        .where('entity.transactionTypeId = :rebalanceType', {
            rebalanceType: rebalanceType.id
        })
        .getMany();

    const badFundTrans = badFundTransResp
        .filter(ft => ft.transactionDetails.length === 0)
        .map(ft => ft.id);

    if (badFundTrans.length) {
        const deletes = await ftRepo.delete(badFundTrans);
    }
})();
