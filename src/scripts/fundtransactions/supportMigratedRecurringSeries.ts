import { getOrCreateConnection } from '../../typeorm';
import { TransactionRecurrence, FundTransaction, FundTransactionInfo } from '../../models';
import { TransactionType, TransactionTypeValue } from '../../models/TransactionType';
import {
    convertRRuleFromString,
    _29DayRangeRRule
} from '../../utilities/getRruleForRecurringActions';
import { dayjs } from '../../utilities/datetime';
import { transformRecurrenceRecordIntoCreateGrantInput } from '../../utilities/transformGrantRefIntoCreateGrantInput';
import { createGrant } from '../../utilities/createGrant';

(async () => {
    const connection = await getOrCreateConnection();
    const manager = connection.manager;

    async function getTransactionRecurrenceDateArrays(): Promise<
        { id: string; dates: Date[]; type: TransactionTypeValue }[]
    > {
        const transactionRecurrences = await manager.find(TransactionRecurrence);
        const dateArrays = transactionRecurrences.map(recurrence => {
            const rrule = convertRRuleFromString(recurrence.recurrenceRule);
            return {
                id: recurrence.id,
                type: !!recurrence.recipientId
                    ? TransactionTypeValue.GRANT
                    : TransactionTypeValue.CONTRIBUTION,
                dates: _29DayRangeRRule(rrule)
            };
        });
        return dateArrays;
    }

    // creates grants within the the range of today and 29 days
    async function processMigratedGrants(): Promise<void> {
        const today = dayjs()
            .utc()
            .format('MM/DD/YYYY');

        const _29DaysFromNow = dayjs()
            .add(29, 'day')
            .utc()
            .format('MM/DD/YYYY');
        const dateArrays = await getTransactionRecurrenceDateArrays();

        const recurrenceIdsForGrantsToProcess: string[] = dateArrays.reduce(
            (acc: string[], dateObject) => {
                if (dateObject.type === TransactionTypeValue.GRANT) {
                    dateObject.dates.forEach(date => {
                        const formattedDate = dayjs(date)
                            .utc()
                            .format('MM/DD/YYYY');

                        if (formattedDate === today || formattedDate <= _29DaysFromNow) {
                            acc.push(dateObject.id);
                        }
                    });
                }
                return acc;
            },
            []
        );

        console.log(
            'recurrenceIdsForGrantsToProcess length',
            recurrenceIdsForGrantsToProcess.length
        );
        for await (const recurrenceId of recurrenceIdsForGrantsToProcess) {
            const fundTransactionRecurrenceRef = await manager.findOne(TransactionRecurrence, {
                id: recurrenceId
            });

            const transactionType = await manager.findOne(TransactionType, {
                name: TransactionTypeValue.GRANT
            });

            // grabs fund transaction based on the recurrence id
            const fundTransactionRef = await manager.findOne(FundTransaction, {
                transactionRecurrenceId: recurrenceId
            });
            const fundTransactionInfoRef = await manager.findOne(FundTransactionInfo, {
                fundTransactionId: fundTransactionRef.id
            });
            const userProfileId = fundTransactionRef.createdBy;

            // grabs the recipient id from the last transaction
            const recipientId = fundTransactionInfoRef.recipientId;
            const seriesParentMeta = {
                parentRecurrenceId: fundTransactionRecurrenceRef.id,
                scheduledDate: fundTransactionRef.scheduledDate
            };

            const recurrenceInput = transformRecurrenceRecordIntoCreateGrantInput(
                fundTransactionRecurrenceRef,
                seriesParentMeta
            );

            await createGrant(
                manager,
                recipientId,
                userProfileId,
                transactionType,
                recurrenceInput
            );
        }
    }

    await processMigratedGrants();
    process.exit(0);
})();
