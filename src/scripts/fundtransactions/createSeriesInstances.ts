import { getOrCreateConnection } from '../../typeorm';

import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import { finished } from 'stream';

import dayjs from 'dayjs';

import { FundTransaction } from '../../models';
import { TransactionType, TransactionTypeValue } from '../../models/TransactionType';
import { transformRecurrenceRecordIntoCreateGrantInput } from '../../utilities/transformGrantRefIntoCreateGrantInput';
import { createGrant } from '../../utilities/createGrant';
import { convertRRuleFromString } from '../../utilities/getRruleForRecurringActions';

interface Row {
    seriesCode: string;
    value: string;
}

(async () => {
    console.log('creating missing instances for series');

    const { manager } = await getOrCreateConnection();

    const file = path.resolve(__dirname, '../', 'data', 'TS-1991.csv');

    const data: { transactionCode: string; scheduledDate: Date }[] = [];

    // stream csv into array
    const stream = fs
        .createReadStream(file)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
            console.error(error);
            process.exit(0);
        })
        .on('data', (row: Row) => {
            // set to midday
            const scheduledDate = dayjs(row.value)
                .startOf('day')
                .add(12, 'hour')
                .toDate();

            data.push({ transactionCode: row.seriesCode, scheduledDate });
        });

    finished(stream, async err => {
        if (err) {
            console.error('error finishing stream', err);
            return;
        }

        // fetch series and grant type
        const query = manager
            .getRepository(FundTransaction)
            .createQueryBuilder('ft')
            .leftJoinAndSelect('ft.transactionRecurrence', 'transactionRecurrence')
            .leftJoinAndSelect('ft.transactionInfo', 'transactionInfo')
            .leftJoinAndSelect('ft.recurringFundTransactions', 'recurringFundTransactions');

        // maybe not so performant, but it keeps the date and transactionCode together
        const results = await Promise.all(
            data.map(row => {
                return query
                    .andWhere('ft.transactionCode = :transactionCode', {
                        transactionCode: row.transactionCode
                    })
                    .getOne()
                    .then(ft => ({
                        series: ft,
                        scheduledDate: row.scheduledDate
                    }));
            })
        );

        const transactionType = await manager.findOne(TransactionType, {
            name: TransactionTypeValue.GRANT
        });

        const createdGrants: string[] = [];
        let i = 0;
        for await (const { series, scheduledDate } of results) {
            console.log(i);
            // extract rrule
            const rrule = convertRRuleFromString(series.transactionRecurrence.recurrenceRule);
            const { until, count, dtstart } = rrule.options;

            // safety checks
            let error: string;
            const _scheduledDate = dayjs(scheduledDate);

            // count check
            if (typeof count === 'number' && series.recurringFundTransactions.length >= count) {
                error = `max grant count of ${count} exceeded. Existing grant count = ${series.recurringFundTransactions.length}`;
            }
            // start/end check
            else if (dtstart && _scheduledDate.isBefore(dtstart)) {
                error = `${_scheduledDate.toISOString()} is before start date ${dtstart.toISOString()}`;
            } else if (until && _scheduledDate.isAfter(until)) {
                error = `${_scheduledDate.toISOString()} is after end date ${until.toISOString()}`;
            }
            // does a grant with this date exists
            series.recurringFundTransactions.forEach(
                ({ scheduledDate: ftDate, transactionCode }) => {
                    if (_scheduledDate.isSame(ftDate)) {
                        error = `${_scheduledDate.toISOString()} already exists: ${transactionCode} scheduledDate = ${ftDate.toISOString()}`;
                    }
                }
            );

            // return early if error
            if (error) {
                console.error(`ERROR for ${series.transactionCode}: ${error}`);
                return;
            }

            const recurrenceInput = transformRecurrenceRecordIntoCreateGrantInput(
                series.transactionRecurrence,
                {
                    parentRecurrenceId: series.transactionRecurrence.id,
                    scheduledDate: scheduledDate
                }
            );

            let createdGrant: FundTransaction;
            try {
                createdGrant = await createGrant(
                    manager,
                    series.transactionInfo.recipientId,
                    series.createdBy,
                    transactionType,
                    recurrenceInput
                );
            } catch (error) {
                console.log('error creating grant', error);
            }

            if (createdGrant) createdGrants.push(createdGrant.scheduledDate.toISOString());
            i++;
        }

        console.log(`finished creating missing grants:
        ${createdGrants.join(',')}
        `);
    });
})();
