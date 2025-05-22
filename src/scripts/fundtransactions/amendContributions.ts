import { getOrCreateConnection } from '../../typeorm';

import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import { finished } from 'stream';
import { FindConditions, In, UpdateResult } from 'typeorm';
import dayjs from 'dayjs';

import {
    FundTransaction,
    FundTransactionComment,
    FundTransactionDetail,
    FundTransactionInfo,
    TransactionEvent,
    TransactionStatus
} from '../../models';
import { TransactionStatusValue } from '../../models/TransactionStatus';
import { createContributionFromSeries } from '../../utilities/createContribution';
import { processRecurringContributions } from '../../cron/recurring-transactions/initiateRecurringAndFutureContributions';

interface Row {
    Action: string;
    'Cancel/Delete': string;
    'Create Instance': 'x' | '';
    code: string;
    seriesCode: string;
    Value: string; // date
}

type action = 'Delete Instance' | 'Cancel Instance' | 'Update Scheduled Date';

export const amendContributions = async () => {
    console.log('updating some contributions');

    const connection = await getOrCreateConnection();
    const { manager } = connection;
    const fundTransactionRepo = manager.getRepository(FundTransaction);

    const file = path.resolve(
        __dirname,
        '../../..',
        'release-scripts',
        'data',
        'contributionAmendments.csv'
    );

    const updates: {
        transactionCode: string;
        scheduledDate: Date;
    }[] = [];
    const deleteCodes: string[] = [];
    const cancelCodes: string[] = [];
    const createSeriesCodes: string[] = [];

    // stream csv into array
    const stream = fs
        .createReadStream(file)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
            console.error(error);
            process.exit(0);
        })
        .on('data', (row: Row) => {
            const actions = row.Action.split('/').map(item => item.trim()) as action[];

            // cancel, delete, and update
            actions.forEach(action => {
                switch (action) {
                    case 'Cancel Instance':
                        cancelCodes.push(row['Cancel/Delete']);
                        break;

                    case 'Delete Instance':
                        deleteCodes.push(row['Cancel/Delete']);
                        break;

                    case 'Update Scheduled Date':
                        updates.push({
                            transactionCode: row.code,
                            scheduledDate: dayjs(row.Value)
                                .startOf('day')
                                .add(12, 'hour')
                                .toDate()
                        });
                        break;
                }
            });

            // create
            if (row['Create Instance'] === 'x') {
                createSeriesCodes.push(row.seriesCode);
            }
        });

    finished(stream, async err => {
        if (err) {
            console.error('error finishing stream', err);
            return;
        }

        // delete fund transaction and associated records
        const conditions: FindConditions<FundTransaction> = {
            transactionCode: In(deleteCodes)
        };
        const fundTransactionsToBeDeleted = await fundTransactionRepo.find(conditions);
        const deleteCriteria = {
            fundTransactionId: In(fundTransactionsToBeDeleted.map(ft => ft.id))
        };
        await Promise.all([
            manager.delete(FundTransactionDetail, deleteCriteria),
            manager.delete(FundTransactionInfo, deleteCriteria),
            manager.delete(FundTransactionComment, deleteCriteria),
            manager.delete(TransactionEvent, deleteCriteria)
        ]);
        await fundTransactionRepo.delete(conditions);

        // cancel
        const cancelStatus = await manager.findOne(TransactionStatus, {
            name: TransactionStatusValue.CANCELED
        });
        await fundTransactionRepo.update(
            { transactionCode: In(cancelCodes) },
            { transactionStatusId: cancelStatus.id }
        );

        // updates
        const updatePromises: Promise<UpdateResult>[] = [];
        updates.forEach(update => {
            updatePromises.push(
                fundTransactionRepo.update(
                    { transactionCode: update.transactionCode },
                    { scheduledDate: update.scheduledDate }
                )
            );
        });
        await Promise.all(updatePromises);

        // create contributions
        const newContributionCodes: string[] = [];
        const invalidSeries: { seriesCode: string; error: any }[] = [];
        for await (const seriesCode of createSeriesCodes) {
            try {
                const contribution = await createContributionFromSeries(seriesCode, manager);
                newContributionCodes.push(contribution.transactionCode);
            } catch (error) {
                console.log(error);
                invalidSeries.push({ seriesCode, error });
            }
        }

        await processRecurringContributions(connection);

        console.log(`
        deleted ${deleteCodes.length} contributions: ${deleteCodes.join(',')}

        canceled ${cancelCodes.length} contributions: ${cancelCodes.join(',')}

        updated ${updates.length} contributions: ${updates.map(u => u.transactionCode).join(',')}

        created ${newContributionCodes.length} contributions: ${newContributionCodes.join(',')}

        unable to create ${invalidSeries.length} contributions: ${invalidSeries
            .map(s => `series: ${s.seriesCode}\nerror:${s.error}`)
            .join('\n')}
        `);
    });
};
