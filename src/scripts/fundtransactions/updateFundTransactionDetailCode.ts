import { getOrCreateConnection } from '../../typeorm';
import { getManager } from 'typeorm';
import { FundTransactionDetail } from '../../models';
import {
    getTransactionCode,
    getTransactionCodeAbbreviation
} from '../../utilities/getTransactionCode';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const manager = getManager();
    const fundTransactionDetails = await connection
        .getRepository(FundTransactionDetail)
        .createQueryBuilder('entity')
        .where({ transactionCode: null })
        .innerJoinAndSelect('entity.transactionDetailType', 'transactionDetailType')
        .getMany();

    for (const fundDetail of fundTransactionDetails) {
        const transactionType = {
            name: 'fund',
            abbreviation: getTransactionCodeAbbreviation(fundDetail.transactionDetailType.name)
        };
        const transactionCode = await getTransactionCode(transactionType, manager);

        await connection
            .createQueryBuilder()
            .update(FundTransactionDetail)
            .set({ transactionCode })
            .where('id = :id', { id: fundDetail.id })
            .execute();
    }

    process.exit(0);
})();
