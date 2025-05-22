import Stripe from 'stripe';
import { getOrCreateConnection } from '../../typeorm';
import { getStripeClient } from '../../stripe';
import { FundTransactionDetail, Payout, Batch } from '../../models';
import { TransactionDetailStatusValue } from '../../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../../models/TransactionDetailType';
import { DetailPaymentType } from '../../models/FundTransactionDetail';
import { getTransactionDetailStatuses } from '../../utilities/getTransactionStatuses';
import { BatchRepository } from '../../repositories/Batch';
import { currency } from '../../utilities/currency';

export async function getTransactionDetails(): Promise<FundTransactionDetail[]> {
    const connection = await getOrCreateConnection();
    const transactionDetailRepo = connection.getRepository(FundTransactionDetail);
    const transactionDetails = await transactionDetailRepo
        .createQueryBuilder('fundTransactionDetail')
        .innerJoinAndSelect('fundTransactionDetail.fundTransaction', 'fundTransaction')
        .innerJoinAndSelect('fundTransactionDetail.transactionDetailType', 'type')
        .innerJoinAndSelect('fundTransactionDetail.transactionDetailStatus', 'status')
        .where('type.name = :typeName', {
            typeName: TransactionDetailTypeName.CASH_IN
        })
        .andWhere('status.name = :statusName', {
            statusName: TransactionDetailStatusValue.READY_FOR_PAYOUT
        })
        .getMany();
    return transactionDetails;
}

export async function createContributionsPayout() {
    const connection = await getOrCreateConnection();
    const stripeClient = getStripeClient();

    async function createPayoutInStripe(
        amount: number,
        statementCode: string,
        paymentType: 'CREDIT' | 'ACH'
    ): Promise<any> {
        let sourceType: string;
        if (paymentType === 'CREDIT') {
            sourceType = 'card';
        }
        if (paymentType === 'ACH') {
            sourceType = 'bank_account';
        }
        return await stripeClient.payouts.create({
            amount: amount,
            statement_descriptor: statementCode,
            currency: 'USD',
            source_type: sourceType as Stripe.Payout.Type
        });
    }

    async function createPayout(
        transactionDetails: FundTransactionDetail[],
        paymentType: 'CREDIT' | 'ACH'
    ): Promise<Batch> {
        const amount: number = transactionDetails.reduce(
            (sum: number, transactionDetail: FundTransactionDetail): number => {
                return currency.add(sum, transactionDetail.amount);
            },
            0
        );
        // Randomly-generated ID code to reference on bank statement
        const statementCode =
            'Stripe ' +
            Math.random()
                .toString(36)
                .replace('0.', '')
                .toUpperCase()
                .substr(0, 10);

        const balanceResult = await stripeClient.balance.retrieve();
        let availableBalance: number;
        if (paymentType === 'CREDIT') {
            availableBalance = balanceResult.available[0].source_types.card;
        } else {
            availableBalance = balanceResult.available[0].source_types.bank_account;
        }
        // Stripe uses cents instead of dollars.
        const amountInCents = Math.floor(currency.multiply(amount, 100));

        if (availableBalance < amountInCents) {
            console.log(
                `Error creating Stripe payout: Insufficient balance. 
                Amount available: ${currency.divide(availableBalance, 100)}
                Amount requested: ${amount}
                detail records: ${transactionDetails.map(d => d.transactionCode).join(', ')}`
            );

            return null;
        }

        try {
            const payoutCreateResult = await createPayoutInStripe(
                amountInCents,
                statementCode,
                paymentType
            );
            const batch = await connection.transaction(async manager => {
                const stripePayoutRepo = manager.getRepository(Payout);
                const stripePayout = stripePayoutRepo.create({
                    payoutId: payoutCreateResult.id,
                    status: payoutCreateResult.status,
                    amount: amount,
                    statementCode: statementCode,
                    transactionDetails: transactionDetails
                });
                stripePayoutRepo.save(stripePayout);

                const batchRepo = manager.getCustomRepository(BatchRepository);
                const batch = await batchRepo.createContributionPayoutBatch(stripePayout);

                const transactionDetailStatuses = await getTransactionDetailStatuses(manager);
                const transactionDetailRepo = manager.getRepository(FundTransactionDetail);
                const detailIds = transactionDetails.map(d => d.id);
                transactionDetailRepo
                    .createQueryBuilder('transactionDetail')
                    .update()
                    .set({
                        transactionDetailStatusId: transactionDetailStatuses.PENDING_PAYOUT,
                        batchId: batch.id
                    })
                    .whereInIds(detailIds)
                    .execute();
                return batch;
            });

            return batch;
        } catch (error) {
            console.error('Error creating Stripe payout:\n', error);
            return null;
        }
    }

    const transactions = await getTransactionDetails();
    const batches = [];

    const creditCardTransactions = transactions.filter(t => {
        const paymentType = t.fundTransaction.metadata?.paymentDetails?.paymentType;
        if (paymentType) {
            return paymentType === DetailPaymentType.CREDIT;
        }
        return false;
    });

    if (creditCardTransactions.length > 0) {
        const batch = await createPayout(creditCardTransactions, 'CREDIT');
        batch && batches.push(batch);
    }

    const bankTransactions = transactions.filter(t => {
        const paymentType = t.fundTransaction.metadata?.paymentDetails?.paymentType;
        if (paymentType) {
            return paymentType === DetailPaymentType.ACH;
        }
        return false;
    });

    if (bankTransactions.length > 0) {
        const batch = await createPayout(bankTransactions, 'ACH');
        batch && batches.push(batch);
    }

    if (batches.length > 0) {
        return await connection.getRepository(Batch).findByIds(
            batches.map(b => b.id),
            { relations: ['transactions'] }
        );
    }
    return null;
}
