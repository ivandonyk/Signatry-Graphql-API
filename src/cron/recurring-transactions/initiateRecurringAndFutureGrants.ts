import { EntityManager, UpdateResult } from 'typeorm';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

import {
    FundTransaction,
    FundTransactionDetail,
    TransactionDetailStatus,
    TransactionRecurrence,
    TransactionRecurrenceJobDate
} from '../../models';
import { TransactionDetailStatusValue } from '../../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../../models/TransactionDetailType';
import { TransactionType, TransactionTypeValue } from '../../models/TransactionType';
import { getOrCreateConnection } from '../../typeorm';
import { createGrant } from '../../utilities/createGrant';
import { createProposedDetails } from '../../utilities/transactionDetail';
import { transformRecurrenceRecordIntoCreateGrantInput } from '../../utilities/transformGrantRefIntoCreateGrantInput';
import { getScheduledFundTransactions } from './util';
import { addGraphileWorkerJob, JobType } from '../../jobs';
import { calculateUpcomingGrantOccurrences } from './calculateUpcomingGrantOccurrences';

dayjs.extend(isSameOrBefore);

export interface OccurrenceOptions {
    recurrenceId: string;
    nextOccurrenceDate: Date | string;
}

export async function createGrantSeriesOccurrence(
    occurrenceOptions: OccurrenceOptions,
    skipEmail?: boolean
): Promise<void> {
    const connection = await getOrCreateConnection();
    const manager = connection.manager;
    if (!occurrenceOptions.nextOccurrenceDate) {
        console.error(
            'initiateRecurringAndFutureGrants: ERROR in "processRecurringGrants": invalid nextScheduledDate for record: ',
            occurrenceOptions
        );
    }

    // gather recurrence and GRANT type records
    const [fundTransactionRecurrenceRef, transactionType] = await Promise.all([
        manager.findOne(TransactionRecurrence, { id: occurrenceOptions.recurrenceId }),
        manager.findOne(TransactionType, { name: TransactionTypeValue.GRANT })
    ]);

    // grabs fund_transaction and fund_transaction_info
    const fundTransactionRef = await manager.findOne(
        FundTransaction,
        { transactionRecurrenceId: occurrenceOptions.recurrenceId },
        { relations: ['transactionInfo'] }
    );

    // transforms reference info input input format for mutation
    const recurrenceInput = transformRecurrenceRecordIntoCreateGrantInput(
        fundTransactionRecurrenceRef,
        {
            parentRecurrenceId: fundTransactionRecurrenceRef.id,
            scheduledDate: occurrenceOptions.nextOccurrenceDate
        }
    );

    await createGrant(
        manager,
        // grabs the recipient id from the last transaction
        fundTransactionRef.transactionInfo.recipientId,
        // sets user profile id since the cron isn't logged in
        fundTransactionRef.createdBy,
        transactionType,
        recurrenceInput,
        { skipEmail: skipEmail || false },
        'processRecurringGrants'
    );
}

// creates grants/contributions 30 days in advance
export async function processRecurringGrants(
    manager: EntityManager,
    skipEmail?: boolean
): Promise<void> {
    const logLabel = 'processRecurringGrants';
    console.time(logLabel);
    console.info(`${logLabel}: starting`);

    const grantOccurrencesToCreate = await calculateUpcomingGrantOccurrences();

    console.info(`${logLabel}: grant occurrences to create: `, grantOccurrencesToCreate.length);

    for (const occurrence of grantOccurrencesToCreate)
        await addGraphileWorkerJob(JobType.PROCESS_GRANT, {
            occurrenceOptions: occurrence,
            skipEmail
        });

    console.timeEnd(logLabel);
    console.info(`${logLabel}: finished`);
}

export async function initiateGrant(
    transactionId: string,
    transactionAmount: number,
    readyForPayoutId: string,
    readyForDivestmentId: string
) {
    const { manager } = await getOrCreateConnection();
    const transactionTogLabel = `transaction:${transactionId}`;
    console.time(transactionTogLabel);
    console.info(`${transactionTogLabel}: started`);

    const fundTxDetailsToProcess = await manager.find(FundTransactionDetail, {
        where: { fundTransactionId: transactionId },
        relations: ['transactionDetailType']
    });

    // update status for detail records
    const updates: Promise<UpdateResult>[] = [];
    for (const fundDetail of fundTxDetailsToProcess) {
        switch (fundDetail.transactionDetailType.name) {
            case TransactionDetailTypeName.GRANT_DIVESTMENT_CASH:
                await manager.update(FundTransactionDetail, fundDetail.id, {
                    transactionDetailStatusId: readyForPayoutId,
                    amount: transactionAmount
                });
                break;

            case TransactionDetailTypeName.CASH_OUT:
                await manager.update(FundTransactionDetail, fundDetail.id, {
                    transactionDetailStatusId: readyForDivestmentId,
                    amount: transactionAmount
                });
                break;

            default:
                break;
        }
    }

    // handle divestment allocations
    const transaction = await manager.findOne(FundTransaction, transactionId);
    try {
        console.info(`${transactionTogLabel}: createProposedDetails started`);
        const proposedDetails = await createProposedDetails(manager, transactionId);
        console.info(`${transactionTogLabel}: createProposedDetails finished`);
        transaction.metadata = { proposedDetails };
        await manager.save(transaction);
        console.info(`${transactionTogLabel}: transaction saved`);
    } catch (error) {
        console.error(
            `initiateRecurringAndFutureGrants: Unable to create detail metadata for grant ${transaction.transactionCode}: ${error}`
        );
    }

    console.timeEnd(transactionTogLabel);
    console.info(`${transactionTogLabel}: finished`);
}

export async function initiateRecurringAndFutureGrants() {
    const initiateRecurringAndFutureGrantsLogLabel = 'initiateRecurringAndFutureGrants';
    console.info(`${initiateRecurringAndFutureGrantsLogLabel}: started`);

    const connection = await getOrCreateConnection();
    const manager = connection.manager;

    // "start" grants with a scheduled date of today
    async function startFundTransactionsWithScheduledDateOfToday(): Promise<void> {
        const startFundTransactionsWithScheduledDateOfTodayLogLabel =
            'startFundTransactionsWithScheduledDateOfToday';
        console.group(startFundTransactionsWithScheduledDateOfTodayLogLabel);
        console.time(startFundTransactionsWithScheduledDateOfTodayLogLabel);
        console.info(`${startFundTransactionsWithScheduledDateOfTodayLogLabel}: started`);

        const [
            scheduledFundTransactions,
            // statuses
            readyForPayoutStatus,
            readyForDivestmentStatus
        ] = await Promise.all([
            getScheduledFundTransactions(manager, TransactionTypeValue.GRANT),
            manager.findOne(TransactionDetailStatus, {
                name: TransactionDetailStatusValue.READY_FOR_PAYOUT
            }),
            manager.findOne(TransactionDetailStatus, {
                name: TransactionDetailStatusValue.READY_FOR_DIVESTMENT
            })
        ]);
        console.info(
            `${startFundTransactionsWithScheduledDateOfTodayLogLabel}: getScheduledFundTransactions`
        );

        for (const transaction of scheduledFundTransactions) {
            await addGraphileWorkerJob(JobType.INITIATE_GRANT, {
                transactionId: transaction.id,
                readyForPayoutId: readyForPayoutStatus.id,
                readyForDivestmentId: readyForDivestmentStatus.id,
                transactionAmount: transaction.amount
            });
        }

        console.timeEnd(startFundTransactionsWithScheduledDateOfTodayLogLabel);
        console.info(`${startFundTransactionsWithScheduledDateOfTodayLogLabel}: finished`);
        console.groupEnd();
    }

    await processRecurringGrants(connection.manager);
    await startFundTransactionsWithScheduledDateOfToday();

    console.info(`${initiateRecurringAndFutureGrantsLogLabel}: Finished`);
}

// run recurring grant engine from `startDate` to today
export async function processRecurringGrantsFromDate(startDate: string, manager: EntityManager) {
    const today = dayjs();
    // generate array of dates
    const dates: dayjs.Dayjs[] = [];
    let runDate = dayjs(startDate);

    while (runDate.isSameOrBefore(today, 'day')) {
        dates.push(runDate);
        runDate = dayjs(runDate).add(1, 'day');
    }

    // synchronously updating schedule date and creating grants
    for (const date of dates) {
        await manager.update(TransactionRecurrenceJobDate, 1, {
            date: date
                .startOf('day')
                .add(12, 'hour')
                .toDate()
        });
        try {
            console.log(
                `initiateRecurringAndFutureGrants: Processing grants that should occur within a month after ${date}`
            );
            await processRecurringGrants(manager, true);
        } catch (error) {
            console.error(`initiateRecurringAndFutureGrants: Error - ${error.message}`);
            break;
        }
    }
}
