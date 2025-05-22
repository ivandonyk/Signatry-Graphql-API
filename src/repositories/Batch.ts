import { EntityRepository, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
// models
import {
    Batch,
    FundTransactionDetail,
    GLAccount,
    InstitutionAccountTransaction,
    Payout,
    TransactionDetailStatus
} from '../models';
import { BatchPaymentTypeValue } from '../models/Batch';
import { GLAccountTypeName } from '../models/GLAccountType';
import { InstitutionAccountTransactionType } from '../models/InstitutionAccountTransaction';
import { AccountProviderName } from '../models/ProviderAccountData';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { currency } from '../utilities/currency';
import { dayjs } from '../utilities/datetime';
import { GLAccountRepository } from './GLAccount';

@EntityRepository(Batch)
export class BatchRepository extends Repository<Batch> {
    private async createMockTransactionForBatch(batch: Batch) {
        const transactionRepo = this.manager.getRepository(InstitutionAccountTransaction);

        const sourceGLAccountBatch = await this.createQueryBuilder('batch')
            .innerJoinAndSelect('batch.sourceGLAccount', 'sourceGLAccount')
            .innerJoinAndSelect(
                'sourceGLAccount.institutionAccount',
                'institutionAccount',
                'institutionAccount.isSweepAccount = false'
            )
            .where('batch.id = :batchId', { batchId: batch.id })
            .getOne();

        const destinationGLAccountBatch = await this.createQueryBuilder('batch')
            .innerJoinAndSelect('batch.destinationGLAccount', 'destinationGLAccount')
            .innerJoinAndSelect(
                'destinationGLAccount.institutionAccount',
                'institutionAccount',
                'institutionAccount.isSweepAccount = false'
            )
            .where('batch.id = :batchId', { batchId: batch.id })
            .getOne();

        const mockTransactions = [];
        const typeMap = {
            ACH: InstitutionAccountTransactionType.TRANSFER,
            CHECK: InstitutionAccountTransactionType.CHECK,
            DEPOSIT: InstitutionAccountTransactionType.DEPOSIT,
            FEE: InstitutionAccountTransactionType.FEE,
            INTEREST: InstitutionAccountTransactionType.INTEREST,
            WIRE: InstitutionAccountTransactionType.TRANSFER,
            WITHDRAWAL: InstitutionAccountTransactionType.WITHDRAWAL,
            DIVIDEND: InstitutionAccountTransactionType.DIVIDEND,
            SELL: InstitutionAccountTransactionType.SELL,
            BUY: InstitutionAccountTransactionType.BUY,
            REINVESTMENT: InstitutionAccountTransactionType.REINVESTMENT,
            CREDIT: InstitutionAccountTransactionType.CREDIT,
            DEBIT: InstitutionAccountTransactionType.DEBIT,
            OTHER: InstitutionAccountTransactionType.OTHER,
            TRANSFER: InstitutionAccountTransactionType.TRANSFER,
            INCOME: InstitutionAccountTransactionType.INCOME
        };

        if (sourceGLAccountBatch) {
            const transactionType = typeMap[batch.paymentType];
            mockTransactions.push(
                transactionRepo.create({
                    institutionAccountId:
                        sourceGLAccountBatch.sourceGLAccount.institutionAccount.id,
                    amount: -1 * Math.abs(sourceGLAccountBatch.amount),
                    transactionId: `MOCK-sourceBatch-${sourceGLAccountBatch.batchCode}`,
                    name: `MOCK-sourceBatch-${sourceGLAccountBatch.batchCode}`,
                    transactionType: transactionType,
                    provider: AccountProviderName.BAA,
                    postedOn: sourceGLAccountBatch.createdOn,
                    executionDate: sourceGLAccountBatch.createdOn,
                    createdOn: sourceGLAccountBatch.createdOn
                })
            );
        }

        if (destinationGLAccountBatch) {
            const transactionType = typeMap[batch.paymentType];
            mockTransactions.push(
                transactionRepo.create({
                    institutionAccountId:
                        destinationGLAccountBatch.destinationGLAccount.institutionAccount.id,
                    amount: Math.abs(destinationGLAccountBatch.amount),
                    transactionId: `MOCK-destBatch-${destinationGLAccountBatch.batchCode}`,
                    name: `MOCK-destBatch-${destinationGLAccountBatch.batchCode}`,
                    transactionType: transactionType,
                    provider: AccountProviderName.BAA,
                    postedOn: destinationGLAccountBatch.createdOn,
                    executionDate: destinationGLAccountBatch.createdOn,
                    createdOn: destinationGLAccountBatch.createdOn
                })
            );
        }

        await transactionRepo.save(mockTransactions);
    }

    async createContributionPayoutBatch(payout: Payout): Promise<Batch> {
        const glAccountRepo = this.manager.getCustomRepository(GLAccountRepository);
        // Account into which fund contributions are paid
        const primaryGLAccount = await glAccountRepo.getByType(GLAccountTypeName.PRIMARY);

        // Account that tracks contribution revenue
        const contributionRevenueAccount = await glAccountRepo.getByType(
            GLAccountTypeName.CONTRIBUTION_REVENUE
        );
        const description = `SYSTEM BATCH ID: Stripe contributions payout ${payout.statementCode}`;
        const totalAmount = payout.transactionDetails.reduce((sum, td) => {
            return currency.add(sum, td.amount);
        }, 0);
        const batchCode = await this.getNextBatchCode();

        const batch = await this.save({
            description: description,
            amount: totalAmount,
            sourceGLAccountId: contributionRevenueAccount.id,
            destinationGLAccountId: primaryGLAccount.id,
            paymentType: BatchPaymentTypeValue.ACH,
            batchCode: batchCode,
            sourceInfo: { notRequired: true }
        });

        if (process.env.RECONCILIATION_MOCK_TRANSACTIONS === 'true') {
            const yesterday = dayjs()
                .subtract(1, 'day')
                .toDate();
            batch.createdOn = yesterday; // Set batch createdOn back a day so it appears on reconciliation
            await this.update(batch.id, { createdOn: yesterday });

            this.createMockTransactionForBatch(batch);
        }
        return batch;
    }

    async generateBatchEntityForTransactions(
        transactions: FundTransactionDetail[],
        sourceAccountId: string,
        destinationAccountId: string,
        paymentType?: BatchPaymentTypeValue
    ): Promise<Batch> {
        const sourceAccount = await this.manager
            .getRepository(GLAccount)
            .createQueryBuilder('glAccount')
            .leftJoinAndSelect(
                'glAccount.institutionAccount',
                'institutionAccount',
                'institutionAccount.isSweepAccount = FALSE'
            )
            .where('glAccount.id = :sourceAccountId', { sourceAccountId: sourceAccountId })
            .getOne();

        const destinationAccount = await this.manager
            .getRepository(GLAccount)
            .createQueryBuilder('glAccount')
            .leftJoinAndSelect(
                'glAccount.institutionAccount',
                'institutionAccount',
                'institutionAccount.isSweepAccount = FALSE'
            )
            .where('glAccount.id = :destinationAccountId', {
                destinationAccountId: destinationAccountId
            })
            .getOne();

        // If institution account is not linked for GL account, cannot be reconciled
        // E.g. revenue accounts, expense accounts
        const sourceInfo = { notRequired: sourceAccount.institutionAccount ? false : true };
        const destinationInfo = {
            notRequired: destinationAccount.institutionAccount ? false : true
        };
        const totalAmount = transactions.reduce(
            (sum: number, transaction: FundTransactionDetail) => {
                return currency.add(sum, Math.abs(transaction.amount));
            },
            0
        );
        const batchCode = await this.getNextBatchCode();
        const defaults = {
            id: uuid(),
            amount: totalAmount,
            paymentType: paymentType || BatchPaymentTypeValue.WIRE,
            batchCode
        };
        const description = this.generateDescription(batchCode, sourceAccount, destinationAccount);
        return this.create({
            ...defaults,
            description,
            sourceGLAccountId: sourceAccount.id,
            destinationGLAccountId: destinationAccount.id,
            sourceGLAccount: sourceAccount,
            destinationGLAccount: destinationAccount,
            transactions: transactions,
            sourceInfo: sourceInfo,
            destinationInfo: destinationInfo
        });
    }

    async createBatchForTransactions(
        transactions: FundTransactionDetail[],
        sourceAccountId: string,
        destinationAccountId: string,
        paymentType?: BatchPaymentTypeValue
    ): Promise<Batch> {
        const entity = await this.generateBatchEntityForTransactions(
            transactions,
            sourceAccountId,
            destinationAccountId,
            paymentType
        );
        const batch = await this.save(entity);
        const transactionStatus = await this.manager
            .getRepository(TransactionDetailStatus)
            .findOne({ name: TransactionDetailStatusValue.PENDING_RECONCILIATION });
        
        // Update transaction statuses
        if(transactions.length > 0){
            await this.manager
                .getRepository(FundTransactionDetail)
                .createQueryBuilder('transactionDetail')
                .update()
                .set({ transactionDetailStatusId: transactionStatus.id, batchId: batch.id })
                .whereInIds(transactions.map(t => t.id))
                .execute();
        }
        
        if (process.env.RECONCILIATION_MOCK_TRANSACTIONS === 'true') {
            const yesterday = dayjs()
                .subtract(2, 'day')
                .toDate();
            batch.createdOn = yesterday; // Set batch createdOn back a day so it appears on reconciliation
            await this.update(batch.id, { createdOn: yesterday });
            
            this.createMockTransactionForBatch(batch);
        }
        return batch;
    }

    async createManualBatch(
        transactions?: FundTransactionDetail[],
        manualTransactions?: FundTransactionDetail[],
        sourceInvestmentId?: string,
        destinationInvestmentId?: string,
        paymentType?: BatchPaymentTypeValue,
        reconciliationLineItemDate?: string
    ): Promise<Batch> {
        const glAccountRepo = this.manager.getCustomRepository(GLAccountRepository);

        let sourceGLAccount: GLAccount;
        let destinationGLAccount: GLAccount;
        const sourceInfo = { notRequired: false };
        const destinationInfo = { notRequired: false };

        if (!!sourceInvestmentId) {
            sourceGLAccount = await glAccountRepo
                .createQueryBuilder('glAccount')
                .leftJoinAndSelect('glAccount.investment', 'investment')
                .leftJoinAndSelect('glAccount.institutionAccount', 'institutionAccount')
                .where('glAccount.id = :glId', { glId: sourceInvestmentId })
                .getOne();
        } else {
            sourceInfo.notRequired = true;
        }

        if (!!destinationInvestmentId) {
            destinationGLAccount = await glAccountRepo
                .createQueryBuilder('glAccount')
                .leftJoinAndSelect('glAccount.investment', 'investment')
                .leftJoinAndSelect('glAccount.institutionAccount', 'institutionAccount')
                .where('glAccount.id = :glId', { glId: destinationInvestmentId })
                .getOne();
        } else {
            destinationInfo.notRequired = true;
        }

        // allow up to 15 decimals
        const precision = 15;
        const totalAmount =
            (transactions &&
                transactions.reduce((sum: number, transaction: FundTransactionDetail) => {
                    return currency.add(sum, transaction.amount, precision);
                }, 0)) ||
            0;

        const manualTransactionsTotalAmount =
            (manualTransactions &&
                manualTransactions.reduce((sum: number, transaction: FundTransactionDetail) => {
                    return currency.add(sum, transaction.amount, precision);
                }, 0)) ||
            0;

        const batchCode = await this.getNextBatchCode();
        const description = this.generateDescription(
            batchCode,
            sourceGLAccount,
            destinationGLAccount
        );

        const batch = await this.save({
            description: description,
            amount: currency.add(totalAmount, manualTransactionsTotalAmount, precision),
            sourceGLAccountId: sourceGLAccount?.id || null,
            destinationGLAccountId: destinationGLAccount?.id || null,
            sourceInfo: sourceInfo,
            destinationInfo: destinationInfo,
            paymentType: paymentType,
            batchCode: batchCode
        });

        if (!!reconciliationLineItemDate) {
            const recLineItemDate = dayjs(reconciliationLineItemDate).toDate();
            batch.createdOn = recLineItemDate; // Set batch createdOn as the same date as reconciliation line item
            await this.update(batch.id, { createdOn: recLineItemDate });
        } else if (
            !reconciliationLineItemDate &&
            process.env.RECONCILIATION_MOCK_TRANSACTIONS === 'true'
        ) {
            const yesterday = dayjs()
                .subtract(2, 'day')
                .toDate();
            const allTransactions = [...(manualTransactions ?? []), ...(transactions ?? [])];
            batch.createdOn = allTransactions[0]?.createdOn ?? yesterday; // Set batch createdOn to transaction date
            await this.update(batch.id, { createdOn: batch.createdOn });
            this.createMockTransactionForBatch(batch);
        }

        return batch;
    }

    private async getNextBatchCode(): Promise<string> {
        const [{ nextval: batchCode }] = await this.manager.query("SELECT nextval('batchcode')");
        return batchCode;
    }

    private generateDescription(
        batchCode: string,
        sourceGLAccount?: GLAccount,
        destinationGLAccount?: GLAccount
    ) {
        let sourceAccountName: string | undefined;
        let sourceAccountNumber: string | undefined;
        let destinationAccountName: string | undefined;
        let destinationAccountNumber: string | undefined;
        if (!!sourceGLAccount) {
            sourceAccountName = sourceGLAccount.institutionAccount
                ? sourceGLAccount.institutionAccount.custodianName.substring(0, 15)
                : sourceGLAccount.title.substring(0, 15);
            sourceAccountNumber = sourceGLAccount.institutionAccount
                ? sourceGLAccount.institutionAccount.accountNumber.substring(-4)
                : 'XXXX';
        }
        if (!!destinationGLAccount) {
            destinationAccountName = destinationGLAccount.institutionAccount
                ? destinationGLAccount.institutionAccount.custodianName.substring(0, 15)
                : destinationGLAccount.title.substring(0, 15);
            destinationAccountNumber = destinationGLAccount.institutionAccount
                ? destinationGLAccount.institutionAccount.accountNumber.substring(0, 15)
                : destinationGLAccount.title.substring(0, 15);
        }

        return `SYSTEM BATCH ID: ${batchCode}, FROM ${sourceAccountName ||
            'N/A'}... - ${sourceAccountNumber || 'N/A'}, TO ${destinationAccountName ||
            'N/A'}... - ${destinationAccountNumber || 'N/A'}`;
    }
}
