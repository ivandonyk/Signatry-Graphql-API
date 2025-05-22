import { getOrCreateConnection } from '../../typeorm';

import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import { finished } from 'stream';
import { In, UpdateResult } from 'typeorm';
import dayjs from 'dayjs';

import { FundTransaction, FundTransactionInfo } from '../../models';

interface Row {
    code: string;
    action: string;
    value: string;
}

(async () => {
    console.log('updating grant scheduled dates');

    const connection = await getOrCreateConnection();

    const file = path.resolve(
        __dirname,
        '../../..',
        'release-scripts',
        'data',
        'updateGrantScheduleDates.csv'
    );

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
            // parse out date from string
            const [actionDate] = row.action.match(/\d{1,2}\D\d{1,2}\D(\d{4}|\d{2})/g) || [];
            // or it's in the value column (csv structure has changed)
            const date = actionDate || row.value;

            const scheduledDate = dayjs(date)
                .startOf('day')
                .add(12, 'hour')
                .toDate();

            data.push({ transactionCode: row.code, scheduledDate });
        });

    finished(stream, async err => {
        if (err) {
            console.error('error finishing stream', err);
            return;
        }

        // update grant scheduledDate
        const grantPromises: Promise<UpdateResult>[] = [];
        data.forEach(grantData => {
            grantPromises.push(
                connection.manager
                    .createQueryBuilder()
                    .update(FundTransaction)
                    .set({ scheduledDate: grantData.scheduledDate })
                    .where({ transactionCode: grantData.transactionCode })
                    .returning(['id', 'scheduledDate'])
                    .updateEntity(true)
                    .execute()
            );
        });

        const results = await Promise.all(grantPromises);

        // update info requestedProcessDate
        const infoPromises: Promise<UpdateResult>[] = [];
        results.forEach((result, i) => {
            if (!result.raw.length) {
                console.log(`unable to update dates for ${data[i].transactionCode}`);
                return;
            }

            const { id, scheduled_date } = result.raw[0];

            infoPromises.push(
                connection.manager
                    .createQueryBuilder()
                    .update(FundTransactionInfo)
                    .set({ requestedProcessDate: scheduled_date })
                    .where({ fundTransactionId: id })
                    .execute()
            );
        });

        await Promise.all(infoPromises);

        console.log(`updated ${results.length} grants: 
            ${data.map(d => d.transactionCode).join(',')}
        `);
    });
})();
