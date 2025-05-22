import { TransactionRecurrence } from '../models';
import { RecurrenceStatuses } from './transactionRecurrence.resolver';
import RRule from 'rrule';

function isActive(rule: RRule, today: Date) {
    // If the rule does not have 'until' or 'count' assigned, it never expires, so return it
    if (!rule.origOptions.until && !rule.origOptions.count) return true;

    // If the rule has a recurrence date after today, it's still active
    if (!!rule.after(today)) {
        return true;
    } else {
        return false;
    }
}

export function filterRecurrencesByStatus(
    recurrences: TransactionRecurrence[],
    recurrenceStatus?: RecurrenceStatuses,
    ruleKey = 'recurrenceRule'
): TransactionRecurrence[] {
    // Use the rrule to determine whether the TransactionRecurrence is ACTIVE or EXPIRED
    return recurrences.filter(recurrenceRecord => {
        const rule = RRule.fromString(recurrenceRecord[ruleKey]);
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        switch (recurrenceStatus) {
            case RecurrenceStatuses.CANCELLED:
                return !recurrenceRecord.enabled;
            case RecurrenceStatuses.ACTIVE:
                return recurrenceRecord.enabled && isActive(rule, todayUTC);
            case RecurrenceStatuses.EXPIRED:
                return recurrenceRecord.enabled && !isActive(rule, todayUTC);
            case RecurrenceStatuses.ALL:
            case undefined:
                return recurrences;
            default:
                throw new Error('Unconfigured recurrenceStatus requested');
        }
    });
}
