import { getOrCreateConnection } from '../../typeorm';

import { In, UpdateResult } from 'typeorm';
import dayjs from 'dayjs';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import rrule, { rrulestr, Options } from 'rrule';
import { finished } from 'stream';

import { FundTransaction, TransactionRecurrence } from '../../models';
import { processRecurringGrantsFromDate } from '../../cron/recurring-transactions/initiateRecurringAndFutureGrants';

interface Row {
    flag: string;
    action: string;
    seriesCode: string;
}

(async () => {
    console.log('amending grant series start date');

    const connection = await getOrCreateConnection();
    const fundTransactionRepo = connection.getRepository(FundTransaction);
    const recurrenceRepo = connection.getRepository(TransactionRecurrence);

    const file = path.resolve(
        __dirname,
        '../../..',
        'release-scripts',
        'data',
        'updateStartDate.csv'
    );

    const rows: Row[] = [];

    // create stream
    const stream = fs
        .createReadStream(file)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
            console.error(error);
            process.exit(0);
        })
        .on('data', (row: Row) => {
            if (row.flag === 'a') rows.push(row);
        });

    finished(stream, async err => {
        if (err) {
            console.error('error finishing stream', err);
            return;
        }

        const nullifiedScheduleDates: Promise<UpdateResult>[] = [];
        const transactionCodes: string[] = [];
        rows.forEach(row => {
            // nullify series scheduled date
            nullifiedScheduleDates.push(
                fundTransactionRepo
                    .createQueryBuilder()
                    .update()
                    .set({ scheduledDate: null })
                    .where('transactionCode = :seriesCode', { seriesCode: row.seriesCode })
                    .execute()
            );
            // gather transactionCodes
            transactionCodes.push(row.seriesCode);
        });

        await Promise.all(nullifiedScheduleDates);

        // fetch series records with recurrences
        const series = await fundTransactionRepo.find({
            where: { transactionCode: In(transactionCodes) },
            relations: ['transactionRecurrence']
        });

        // track earliest start date for recurrence engine
        let earliestDate = dayjs();
        // update recurrence rule
        const recurrenceUpdates: Promise<UpdateResult>[] = [];
        series.forEach(seriesGrant => {
            // fetch "action" from csv data
            const { action } = rows.find(row => row.seriesCode === seriesGrant.transactionCode);
            // parse out date from action string
            const [startDate] = action.match(/\d{1,2}\D\d{1,2}\D(\d{4}|\d{2})/g);

            // fetch original rule
            const originalRule = rrulestr(seriesGrant.transactionRecurrence.recurrenceRule);
            // generate next dtStart date and check if its the earliest in the csv
            const nextDtStart = dayjs(startDate).add(12, 'hour');
            if (nextDtStart.isBefore(earliestDate, 'day')) {
                earliestDate = nextDtStart;
            }
            // generate new rule
            const recurrenceRule = new rrule({
                ...(originalRule.origOptions as Options),
                dtstart: nextDtStart.toDate()
            }).toString();

            recurrenceUpdates.push(
                recurrenceRepo
                    .createQueryBuilder()
                    .update()
                    .set({ recurrenceRule })
                    .where({ id: seriesGrant.transactionRecurrenceId })
                    .execute()
            );
        });

        console.log(`amended start dates for ${rows.length} records`);
        await Promise.all(recurrenceUpdates);

        console.log('running recurrence engine 💅');
        await processRecurringGrantsFromDate(earliestDate.toString(), connection.manager);

        console.log('finished! check out these series\n', "'" + transactionCodes.join("','") + "'");
    });
})();
