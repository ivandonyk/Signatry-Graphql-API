import { FundTransactionInfo, FundTransaction, TransactionRecurrence } from '../models';
import { CreateGrantRecommendationInput } from '../inputs/FundTransaction/CreateGrantRecommendationInput';

export const transformGrantRefIntoCreateGrantInput = (
    fundTransactionRef: FundTransaction,
    fundTransactionInfoRef: FundTransactionInfo
): CreateGrantRecommendationInput => {
    return {
        fundId: fundTransactionRef.fundId,
        amount: fundTransactionRef.amount,
        purposeCategory: fundTransactionInfoRef.purposeCategory,
        purposeNotes: fundTransactionInfoRef.purposeNotes,
        specialInstructions: fundTransactionInfoRef.specialInstructions,
        specialRecognition: fundTransactionInfoRef.specialRecognition,
        includeFundNameInRecognition: fundTransactionInfoRef.includeFundNameInRecognition,
        includeDonorNameInRecognition: fundTransactionInfoRef.includeDonorNameInRecognition,
        includeDonorAddressInRecognition: fundTransactionInfoRef.includeDonorAddressInRecognition,
        recurringTiming: null,
        oneTimeGrantTiming: null,
        originalFundTransactionId: fundTransactionRef.id,
        recipientName: null,
        recipientNotes: null
    };
};

export const transformRecurrenceRecordIntoCreateGrantInput = (
    fundTransactionRecurrenceRef: TransactionRecurrence,
    seriesParentMeta: any
): CreateGrantRecommendationInput => {
    return {
        fundId: fundTransactionRecurrenceRef.transactionRef.fundId,
        amount: fundTransactionRecurrenceRef.transactionRef.amount,
        purposeCategory: fundTransactionRecurrenceRef.transactionRef.purposeCategory,
        purposeNotes: fundTransactionRecurrenceRef.transactionRef.purposeNotes,
        specialInstructions: fundTransactionRecurrenceRef.transactionRef.specialInstructions,
        specialRecognition: fundTransactionRecurrenceRef.transactionRef.specialRecognition,
        includeFundNameInRecognition:
            fundTransactionRecurrenceRef.transactionRef.includeFundNameInRecognition,
        includeDonorNameInRecognition:
            fundTransactionRecurrenceRef.transactionRef.includeDonorNameInRecognition,
        includeDonorAddressInRecognition:
            fundTransactionRecurrenceRef.transactionRef.includeDonorAddressInRecognition,
        recurringTiming: null,
        oneTimeGrantTiming: null,
        originalFundTransactionId:
            fundTransactionRecurrenceRef.transactionRef.originalFundTransactionId,
        parentRecurrenceId: seriesParentMeta.parentRecurrenceId,
        scheduledDate: seriesParentMeta.scheduledDate,
        recipientName: null,
        recipientNotes: null
    };
};
