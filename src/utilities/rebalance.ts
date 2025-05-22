import { Fund, FundTransaction, TransactionStatus, TransactionType, UserProfile } from '../models';
import { EntityManager } from 'typeorm';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { CreateFundRebalanceInput } from '../inputs/FundTransactionRebalance/CreateFundRebalanceInput';
import { TransactionTypeValue } from '../models/TransactionType';
import { getTransactionCode } from './getTransactionCode';
import { trackRebalanceRequested } from './segmentConfig';
import { eventEmitter, EVENTS } from '../events';

export const createRebalance = async (
    manager: EntityManager,
    userProfileId: string,
    input: CreateFundRebalanceInput
): Promise<FundTransaction> => {
    const rebalanceStatusSubmitted = await manager.findOne(TransactionStatus, {
        name: TransactionStatusValue.PENDING
    });

    // Get Current User
    const userProfile = await manager.findOne(UserProfile, {
        id: userProfileId
    });

    // Get Funds
    const fund = await manager.findOne(Fund, {
        where: { id: input.fundId }
    });

    const rebalanceType = await manager.findOne(TransactionType, {
        name: TransactionTypeValue.REBALANCE
    });

    const rebalanceCode = await getTransactionCode(rebalanceType, manager);

    // Run DB calls in a transaction in case Plaid or Stripe API calls fail
    // const rebalance = await manager.transaction(async dbTransaction => {
    //     // Create Fund Transaction Record
    // });
    const fundTransaction = await manager.save(
        manager.create(FundTransaction, {
            fundId: fund.id,
            transactionCode: rebalanceCode,
            transactionRecurrenceId: null,
            transactionTypeId: rebalanceType.id,
            fundTransactionSourceId: null,
            amount: input.amount,
            transactionStatusId: rebalanceStatusSubmitted.id,
            userProfileId: userProfileId,
            createdBy: userProfile.id,
            updatedBy: userProfile.id
        })
    );

    eventEmitter.emit(
        EVENTS.CREATE_REBALANCE_DETIALS,
        fundTransaction.id,
        fund.id,
        input.instructions
    );

    trackRebalanceRequested(userProfileId, fund.fundCode, fund.name);

    return fundTransaction;
};
