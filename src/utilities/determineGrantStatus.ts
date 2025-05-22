import { CreateGrantRecommendationInput } from '../inputs/FundTransaction/CreateGrantRecommendationInput';
import { TransactionStatusValue } from '../models/TransactionStatus';

export const determineGrantStatus = (input: CreateGrantRecommendationInput) => {
    const rightNow = new Date();
    if (
        (!!input.oneTimeGrantTiming &&
            !!input.oneTimeGrantTiming.payBy &&
            new Date(new Date(input.oneTimeGrantTiming.payBy).setHours(0, 0, 0, 0)) >
                new Date(rightNow.setHours(0, 0, 0, 0))) ||
        (!!input.recurringTiming &&
            new Date(new Date(input.recurringTiming.startOn).setHours(0, 0, 0, 0)) >
                new Date(rightNow.setHours(0, 0, 0, 0)))
    ) {
        return TransactionStatusValue.SCHEDULED;
    } else {
        return TransactionStatusValue.SUBMITTED;
    }
};
