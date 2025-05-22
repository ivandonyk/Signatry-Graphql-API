import { RRule } from 'rrule';
import { RecurringGrantRepeatIntervals } from '../models/FundTransaction';
import dayjs from 'dayjs';

const _29daysFromNow = new Date(
    dayjs()
        .add(29, 'day')
        .utc()
        .format('MM/DD/YYYY')
);

const _31daysFromNow = new Date(
    dayjs()
        .add(31, 'day')
        .utc()
        .format('MM/DD/YYYY')
);

const _30daysFromNow = new Date(
    dayjs()
        .add(30, 'day')
        .utc()
        .format('MM/DD/YYYY')
);

const today = new Date(
    dayjs()
        .utc()
        .format('MM/DD/YYYY')
);

export interface RRuleProps {
    startDate: string;
    repeatInterval: string;
    numberOfRecurrences?: number;
    endDate?: string;
}

export const startOnFirstDayOfNextMonth = (startDate: Date) => {
    if (startDate.getUTCDate() !== 1) {
        startDate.setUTCMonth(startDate.getUTCMonth() + 1);
        startDate.setUTCDate(1);
        return startDate;
    } else {
        return startDate;
    }
};

const ifStartDayIsOn29thOr30thAdjustMonthAndDay = (startDate: Date) => {
    if (startDate.getUTCDate() === 29 || startDate.getUTCDate() === 30) {
        startDate.setUTCMonth(startDate.getUTCMonth() + 1);
        startDate.setUTCDate(1);
        return startDate;
    } else {
        return startDate;
    }
};

export const determineRulesForRepeatInterval = ({
    startDate,
    repeatInterval,
    numberOfRecurrences,
    endDate
}: RRuleProps) => {
    switch (repeatInterval) {
        case RecurringGrantRepeatIntervals.EVERY_OTHER_WEEK:
            return {
                dtstart: new Date(startDate),
                freq: RRule.WEEKLY,
                interval: 2,
                until:
                    !!endDate && `${new Date(endDate)}` !== 'Invalid Date'
                        ? new Date(endDate)
                        : undefined
            };
        case RecurringGrantRepeatIntervals.MONTHLY:
            return {
                dtstart: new Date(startDate),
                count: !!numberOfRecurrences ? numberOfRecurrences : undefined,
                freq: RRule.MONTHLY,
                interval: 1,
                until: !!endDate ? new Date(endDate) : undefined
            };
        case RecurringGrantRepeatIntervals.EVERY_OTHER_MONTH:
            return {
                dtstart: new Date(startDate),
                freq: RRule.MONTHLY,
                interval: 2,
                until:
                    !!endDate && `${new Date(endDate)}` !== 'Invalid Date'
                        ? new Date(endDate)
                        : undefined
            };
        case RecurringGrantRepeatIntervals.QUARTERLY:
            return {
                dtstart: new Date(startDate),
                count: !!numberOfRecurrences ? numberOfRecurrences : undefined,
                freq: RRule.MONTHLY,
                interval: 3,
                until: !!endDate ? new Date(endDate) : undefined
            };
        case RecurringGrantRepeatIntervals.SEMI_ANNUALLY:
            return {
                dtstart: new Date(startDate),
                count: !!numberOfRecurrences ? numberOfRecurrences : undefined,
                freq: RRule.MONTHLY,
                interval: 6,
                until: !!endDate ? new Date(endDate) : undefined
            };
        case RecurringGrantRepeatIntervals.ANNUALLY:
            return {
                dtstart: new Date(startDate),
                count: !!numberOfRecurrences ? numberOfRecurrences : undefined,
                freq: RRule.YEARLY,
                interval: 1,
                until: !!endDate ? new Date(endDate) : undefined
            };
        default:
            throw new Error('You have chosen an incorrect value for the Repeat Interval');
    }
};

export const createRRule = ({
    startDate,
    repeatInterval,
    numberOfRecurrences,
    endDate
}: RRuleProps) =>
    new RRule(
        determineRulesForRepeatInterval({ startDate, repeatInterval, numberOfRecurrences, endDate })
    );

export const convertRRuleToString = (rule: RRule) => rule.toString();

export const convertRRuleFromString = (ruleStr: string) => RRule.fromString(ruleStr);

export const convertRRuleToHumanReadable = (rule: RRule) => rule.toText();

export const convertHumanReadableToRRule = (ruleText: string) => RRule.fromText(ruleText);

export const getAllDatesArrayForRRule = (
    rule: RRule,
    iterator?: (d: Date, len: number) => boolean
) => {
    if (iterator) return rule.all(iterator);
    return rule.all();
};

export const get30DaysInAdvanceDatesRRule = (rule: RRule) =>
    rule.between(_29daysFromNow, _31daysFromNow);

// for migration support
export const _29DayRangeRRule = (rule: RRule) => rule.between(today, _29daysFromNow);

export const _30DayRangeRRule = (rule: RRule) => rule.between(today, _30daysFromNow);
