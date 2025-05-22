import { EntityRepository, Repository } from 'typeorm';
import {
    FundInvestment,
    FundTransaction,
    FundTransactionDetail,
    GLAccount,
    TransactionDetailStatus
} from '../models';
import { GLAccountTypeName } from '../models/GLAccountType';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { GLAccountRepository } from './GLAccount';

@EntityRepository(FundTransactionDetail)
export class FundTransactionDetailRepository extends Repository<FundTransactionDetail> {
    async getCashDetailForTransaction(
        transaction: FundTransaction,
        transactionDetailType: TransactionDetailTypeName
    ): Promise<FundTransactionDetail> {
        const cashTransactionDetail = await this.manager
            .createQueryBuilder(FundTransactionDetail, 'fundTransactionDetail')
            .leftJoinAndSelect(
                'fundTransactionDetail.transactionDetailType',
                'transactionDetailType'
            )
            .leftJoinAndSelect(
                'fundTransactionDetail.transactionDetailStatus',
                'transactionDetailStatus'
            )
            .where('fundTransactionDetail.fundTransactionId = :id', { id: transaction.id })
            .andWhere('transactionDetailType.name = :name', {
                name: transactionDetailType
            })
            .getOne();

        return cashTransactionDetail;
    }

    async getDivestmentsForTransaction(
        transaction: FundTransaction
    ): Promise<FundTransactionDetail[]> {
        const divestmentDetails = await this.manager
            .createQueryBuilder(FundTransactionDetail, 'fundTransactionDetail')
            .leftJoinAndSelect(
                'fundTransactionDetail.transactionDetailType',
                'transactionDetailType'
            )
            .leftJoinAndSelect(
                'fundTransactionDetail.transactionDetailStatus',
                'transactionDetailStatus'
            )
            .where('fundTransactionDetail.fundTransactionId = :id', { id: transaction.id })
            .andWhere('transactionDetailType.name = :name', {
                name: TransactionDetailTypeName.DIVESTMENT
            })
            .getMany();

        return divestmentDetails;
    }

    async updateTransactionDetailStatus(
        transactionDetail: FundTransactionDetail,
        statusName: TransactionDetailStatusValue
    ): Promise<FundTransactionDetail> {
        const status = await this.manager.findOne(TransactionDetailStatus, { name: statusName });
        transactionDetail.transactionDetailStatusId = status.id;
        return await this.manager.getRepository(FundTransactionDetail).save(transactionDetail);
    }

    async getSourceAccountForDetailTypeName(
        detailTypeName: string,
        fundInvestmentId?: string,
        fundTransactionId?: string,
        transactionType?: 'Stock Contribution' | 'Transfer'
    ): Promise<GLAccount> {
        const glAccountRepo = this.manager.getCustomRepository(GLAccountRepository);

        switch (detailTypeName) {
            case TransactionDetailTypeName.CASH_IN:
                return await glAccountRepo.getByType(GLAccountTypeName.CONTRIBUTION_REVENUE);
            case TransactionDetailTypeName.CASH_OUT:
                return await glAccountRepo.getByType(GLAccountTypeName.GRANT_DISBURSEMENT);
            case TransactionDetailTypeName.INVESTMENT:
                if (!!transactionType) {
                    if (transactionType === 'Stock Contribution') {
                        return await glAccountRepo.getByType(GLAccountTypeName.SHARED_STOCK);
                    } else if (transactionType === 'Transfer') {
                        return await glAccountRepo.getByType(GLAccountTypeName.GRANT_DISBURSEMENT);
                    }
                } else {
                    return await glAccountRepo.getByType(GLAccountTypeName.PRIMARY);
                }

            // const fundTransaction = await this.manager
            //     .getRepository(FundTransaction)
            //     .createQueryBuilder('fundTransaction')
            //     .leftJoinAndSelect('fundTransaction.transactionType', 'transactionType')
            //     .where('fundTransaction.id = :fundTransactionId', {
            //         fundTransactionId
            //     })
            //     .getOne();

            // if (fundTransaction.transactionType.name === TransactionTypeValue.CONTRIBUTION) {
            //     return await glAccountRepo.getByType(GLAccountTypeName.PRIMARY);
            // } else if (
            //     fundTransaction.transactionType.name === TransactionTypeValue.TRANSFER_IN
            // ) {
            //     return await glAccountRepo.getByType(GLAccountTypeName.GRANT_DISBURSEMENT);
            // }

            case TransactionDetailTypeName.DIVESTMENT:
                const fundInvestment = await this.manager
                    .getRepository(FundInvestment)
                    .createQueryBuilder('fundInvestment')
                    .leftJoinAndSelect('fundInvestment.investment', 'investment')
                    .leftJoinAndSelect('investment.glAccount', 'glAccount')
                    .where('fundInvestment.id = :fundInvestmentId', {
                        fundInvestmentId: fundInvestmentId
                    })
                    .getOne();
                return fundInvestment.investment.glAccount;
            default:
                return null;
        }
    }

    async getDestinationAccountForDetailTypeName(
        detailTypeName: string,
        fundInvestmentId?: string
    ): Promise<GLAccount> {
        const glAccountRepo = this.manager.getCustomRepository(GLAccountRepository);

        switch (detailTypeName) {
            case TransactionDetailTypeName.CASH_IN:
                return await glAccountRepo.getByType(GLAccountTypeName.PRIMARY);
            case TransactionDetailTypeName.CASH_OUT:
                return await glAccountRepo.getByType(GLAccountTypeName.GRANT_RECIPIENT);
            case TransactionDetailTypeName.FEE:
                return await glAccountRepo.getByType(GLAccountTypeName.CREDIT_CARD_FEES);
            case TransactionDetailTypeName.INVESTMENT:
                const fundInvestment = await this.manager
                    .getRepository(FundInvestment)
                    .createQueryBuilder('fundInvestment')
                    .leftJoinAndSelect('fundInvestment.investment', 'investment')
                    .leftJoinAndSelect('investment.glAccount', 'glAccount')
                    .where('fundInvestment.id = :fundInvestmentId', {
                        fundInvestmentId: fundInvestmentId
                    })
                    .getOne();
                return fundInvestment.investment.glAccount;
            case TransactionDetailTypeName.DIVESTMENT:
                return await glAccountRepo.getByType(GLAccountTypeName.GRANT_DISBURSEMENT);
            default:
                return null;
        }
    }
}
