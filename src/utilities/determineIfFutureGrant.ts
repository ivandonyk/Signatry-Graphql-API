import dayjs from 'dayjs';

import { CreateFundContributionInput } from '../inputs/FundTransaction/CreateFundContributionInput';
import { CreateGrantRecommendationInput } from '../inputs/FundTransaction/CreateGrantRecommendationInput';
import { startOnFirstDayOfNextMonth } from './getRruleForRecurringActions';

/** @note make sure time is 12:00:00 */
export function setToMidday(date: string | Date) {
    return dayjs(date)
        .startOf('day')
        .add(12, 'hour')
        .toDate();
}

export const determineIfFutureGrant = (
    input: CreateGrantRecommendationInput | CreateFundContributionInput
): Date | null => {
    const rightNow = new Date();
    if (!input.oneTimeGrantTiming && !!input.recurringTiming) {
        const startOnDate = new Date(input.recurringTiming.startOn);
        if (
            input.recurringTiming.repeat === 'Quarterly' ||
            input.recurringTiming.repeat === 'Semi-Annually'
        ) {
            return setToMidday(startOnFirstDayOfNextMonth(new Date(input.recurringTiming.startOn)));
        } else if (
            new Date(startOnDate.setHours(0, 0, 0, 0)) > new Date(rightNow.setHours(0, 0, 0, 0))
        ) {
            return setToMidday(input.recurringTiming.startOn);
        }
    } else if (
        !input.recurringTiming &&
        !!input.oneTimeGrantTiming &&
        !!input.oneTimeGrantTiming.payBy
    ) {
        const payByDate = new Date(input.oneTimeGrantTiming.payBy);
        if (new Date(payByDate.setHours(0, 0, 0, 0)) > new Date(rightNow.setHours(0, 0, 0, 0))) {
            return setToMidday(input.oneTimeGrantTiming.payBy);
        } else {
            return null;
        }
    } else {
        return null;
    }
};
