import { Connection } from 'typeorm';

import { CreateFundContributionInput } from '../../inputs/FundTransaction/CreateFundContributionInput';
import {
    FundTransaction,
    FundTransactionSource,
    RecurringRecordsToProcessView,
    TransactionRecurrence,
    UserProfileAccount
} from '../../models';
import { TransactionType, TransactionTypeValue } from '../../models/TransactionType';
import { getOrCreateConnection } from '../../typeorm';
import { transformRecurrenceRecIntoContributeToFundInput } from '../../utilities/transformContributionRefIntoContributeToFundInput';
import { getScheduledFundTransactions } from './util';
import { addGraphileWorkerJob, JobType } from '../../jobs';

// process scheduled contributions
export async function processRecurringContributions(
    connection: Connection,
    scheduleDate?: string
): Promise<void> {
    const manager = connection.manager;

    const scheduledFundTransactions = await getScheduledFundTransactions(
        manager,
        TransactionTypeValue.CONTRIBUTION,
        scheduleDate,
        true // only scheduled (omits ASAP)
    );

    console.log(
        `*** SCHEDULED FUND TRANSACTIONS TO BE PROCESSED: ${scheduledFundTransactions
            .map(trans => trans.transactionCode)
            .join(', ')}`
    );

    for (const transaction of scheduledFundTransactions) {
        // fetch user profile account id from transaction OR user profile
        let userProfileAccountId: string = transaction.userProfileAccountId;
        if (!userProfileAccountId) {
            const userProfileAccount = await manager.findOne(UserProfileAccount, {
                userProfileId: transaction.userProfileId
            });
            userProfileAccountId = userProfileAccount.id;
        }

        // generate input
        const input: CreateFundContributionInput = {
            userProfileAccountId,
            fundId: transaction.fundId,
            amount: transaction.amount,
            recurringTiming: null,
            oneTimeGrantTiming: null,
            originalFundTransactionId: null
        };

        await addGraphileWorkerJob(JobType.UPDATE_CONTRIBUTION, {
            userProfileId: transaction.userProfileId,
            input,
            fundTxId: transaction.id
        });
    }
}

// creates contributions 30 days in advance
export async function createRecurringContributions(
    connection: Connection,
    skipEmail?: boolean
): Promise<void> {
    const manager = connection.manager;

    const allRecurrences = await manager.find(RecurringRecordsToProcessView);
    const contributionRecurrences = allRecurrences.filter(
        r => r.transactionType === TransactionTypeValue.CONTRIBUTION_SERIES
    );

    for (const recur of contributionRecurrences) {
        const [
            fundTransactionRecurrenceRef,
            fundTransactionRef,
            contributionType
        ] = await Promise.all([
            manager.findOne(TransactionRecurrence, { id: recur.id }),
            // grabs fund transaction based on the recurrence id
            manager.findOne(FundTransaction, { transactionRecurrenceId: recur.id }),
            manager.findOne(TransactionType, { name: TransactionTypeValue.CONTRIBUTION })
        ]);

        // fetch the profile account
        let userProfileAccountId: string = fundTransactionRef.userProfileAccountId;
        if (!userProfileAccountId) {
            const fundTransactionSourceRef = await manager.findOne(FundTransactionSource, {
                id: fundTransactionRef.fundTransactionSourceId
            });
            userProfileAccountId = fundTransactionSourceRef.userProfileAccountId;
        }

        // transforms reference info input input format for mutation
        const recurrenceInput = transformRecurrenceRecIntoContributeToFundInput(
            fundTransactionRecurrenceRef,
            {
                parentRecurrenceId: fundTransactionRecurrenceRef.id,
                scheduledDate: recur.nextScheduledDate
            }
        );

        await addGraphileWorkerJob(JobType.CREATE_CONTRIBUTION, {
            userProfileId: fundTransactionRef.createdBy,
            userProfileAccountId,
            transactionTypeId: contributionType.id,
            input: recurrenceInput,
            overrideOptions: { skipEmail: skipEmail || false }
        });
    }
}

export async function initiateRecurringAndFutureContributions() {
    const connection = await getOrCreateConnection();

    console.log('initiateRecurringAndFutureContributions: Started');
    // @TODO - re-enable recurring contributions upon successful refactor
    await createRecurringContributions(connection);
    await processRecurringContributions(connection);
    console.log('initiateRecurringAndFutureContributions: Finished');
}
