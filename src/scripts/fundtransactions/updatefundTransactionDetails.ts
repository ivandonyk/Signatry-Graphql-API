import { getOrCreateConnection } from '../../typeorm';
import { FundTransactionDetailRepository } from '../../repositories/FundTransactionDetail';
import { FundTransactionDetail } from '../../models';

(async () => {
    const connection = await getOrCreateConnection({ logging: true });
    const repo = connection.getRepository(FundTransactionDetail);
    const customFundDetailRepo = connection.getCustomRepository(FundTransactionDetailRepository);
    const fundTransactionDetails = await repo
        .createQueryBuilder('entity')
        .innerJoinAndSelect('entity.transactionDetailType', 'transactionDetailType')
        .getMany();

    for (const fundDetail of fundTransactionDetails) {
        const source = await customFundDetailRepo.getSourceAccountForDetailTypeName(
            fundDetail.transactionDetailType.name,
            fundDetail.fundInvestmentId
        );
        const destination = await customFundDetailRepo.getDestinationAccountForDetailTypeName(
            fundDetail.transactionDetailType.name,
            fundDetail.fundInvestmentId
        );

        fundDetail.sourceAccount = source;
        fundDetail.destinationAccount = destination;
    }

    await repo.save(fundTransactionDetails);

    process.exit(0);
})();
