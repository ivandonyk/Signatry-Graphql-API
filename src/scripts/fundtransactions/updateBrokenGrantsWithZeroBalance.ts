import { getOrCreateConnection } from '../../typeorm';
import { FundTransactionDetailRepository } from '../../repositories/FundTransactionDetail';
import { FundTransactionDetail, TransactionDetailType } from '../../models';
import { TransactionDetailTypeName } from '../../models/TransactionDetailType';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const repo = connection.getRepository(FundTransactionDetail);
    const customFundDetailRepo = connection.getCustomRepository(FundTransactionDetailRepository);

    const fundTransactionDetails = await repo
        .createQueryBuilder('entity')
        .innerJoinAndSelect('entity.transactionDetailType', 'transactionDetailType')
        .leftJoinAndSelect('entity.fundTransaction', 'fundTransaction')
        .where('transactionDetailType.name in (:...types)', {
            types: [
                TransactionDetailTypeName.GRANT_DIVESTMENT_CASH,
                TransactionDetailTypeName.CASH_OUT
            ]
        })
        .andWhere('entity.amount = 0')
        .select(['entity.id', 'entity.amount', 'fundTransaction.amount'])
        .getMany();

    let idx = 0;
    for (const fundDetail of fundTransactionDetails) {
        idx += 1;
        await connection
            .createQueryBuilder()
            .update(FundTransactionDetail)
            .set({ amount: fundDetail.fundTransaction.amount })
            .where('id = :id', { id: fundDetail.id })
            .execute();

        console.log(`${idx} / ${fundTransactionDetails.length} completed`);
    }

    console.log(`COMPLETED: ${fundTransactionDetails.length} rows affected`);

    process.exit(0);
})();
