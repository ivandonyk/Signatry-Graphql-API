import { FundTransaction, FundTransactionSource, TransactionRecurrence } from '../models';
import { CreateFundContributionInput } from '../inputs/FundTransaction/CreateFundContributionInput';

export const transformContributionRefIntoContributeToFundInput = (
    fundTransactionRef: FundTransaction,
    fundTransactionSourceRef: FundTransactionSource
): CreateFundContributionInput => {
    return {
        fundId: fundTransactionRef.fundId,
        amount: fundTransactionRef.amount,
        userProfileAccountId: fundTransactionSourceRef.userProfileAccountId,
        recurringTiming: null,
        oneTimeGrantTiming: null,
        contributeOnBehalfOfDonorUserProfileId: fundTransactionRef.createdBy,
        originalFundTransactionId: fundTransactionRef.id
    };
};

export const transformRecurrenceRecIntoContributeToFundInput = (
    fundTransactionRecurrenceRef: TransactionRecurrence,
    seriesParentMeta: any
): CreateFundContributionInput => {
    return {
        fundId: fundTransactionRecurrenceRef.transactionRef.fundId,
        amount: fundTransactionRecurrenceRef.transactionRef.amount,
        userProfileAccountId: fundTransactionRecurrenceRef.transactionRef.userProfileAccountId,
        recurringTiming: null,
        oneTimeGrantTiming: null,
        originalFundTransactionId:
            fundTransactionRecurrenceRef.transactionRef.originalFundTransactionId,
        parentRecurrenceId: seriesParentMeta.parentRecurrenceId,
        scheduledDate: seriesParentMeta.scheduledDate
    };
};
