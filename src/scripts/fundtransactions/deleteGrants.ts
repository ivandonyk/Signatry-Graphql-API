import { getOrCreateConnection } from '../../typeorm';

import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import { finished } from 'stream';
import { In } from 'typeorm';

import {
    FundTransaction,
    FundTransactionComment,
    FundTransactionDetail,
    FundTransactionInfo,
    TransactionEvent
} from '../../models';
import { TransactionStatusValue } from '../../models/TransactionStatus';

interface Row {
    code: string;
}

(async () => {
    console.log('lets delete some grants!');

    const connection = await getOrCreateConnection();
    const fundTransactionRepo = connection.getRepository(FundTransaction);

    const file = path.resolve(__dirname, '../../..', 'release-scripts', 'data', 'deleteGrants.csv');

    const transactionCodes: string[] = [];
    const validStatuses = [
        TransactionStatusValue.SUBMITTED,
        TransactionStatusValue.IN_DUE_DILIGENCE,
        TransactionStatusValue.CANCELED
    ];

    // stream csv into array
    const stream = fs
        .createReadStream(file)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
            console.error(error);
            process.exit(0);
        })
        .on('data', (row: Row) => transactionCodes.push(row.code));

    finished(stream, async err => {
        if (err) {
            console.error('error finishing stream', err);
            return;
        }

        const grants = await fundTransactionRepo.find({
            where: { transactionCode: In(transactionCodes) },
            relations: ['transactionStatus']
        });

        const invalidStatuses: string[] = [];
        const invalidSources: string[] = [];
        const deleteIds: string[] = [];

        grants.forEach(grant => {
            // double check status
            if (!validStatuses.includes(grant.transactionStatus.name)) {
                invalidStatuses.push(grant.transactionCode);
                return;
            }
            // make sure source is null
            if (grant.fundTransactionSourceId !== null) {
                invalidSources.push(grant.transactionCode);
                return;
            }

            deleteIds.push(grant.id);
        });

        // delete associations
        const promises = [
            FundTransactionDetail,
            FundTransactionInfo,
            FundTransactionComment,
            TransactionEvent
        ].map(model => {
            return connection.manager
                .createQueryBuilder()
                .delete()
                .from(model)
                .where({ fundTransactionId: In(deleteIds) })
                .execute();
        });

        await Promise.all(promises);

        // delete grants
        await connection.manager
            .createQueryBuilder()
            .delete()
            .from(FundTransaction)
            .where({ id: In(deleteIds) })
            .execute();

        if (invalidStatuses.length) {
            console.log(
                `Unable to delete the following due to invalid status: ${invalidStatuses.join(',')}`
            );
        }
        if (invalidSources.length) {
            console.log(
                `Unable to delete the following due to having a source transaction: ${invalidSources.join(
                    ','
                )}`
            );
        }

        console.log(`deleted ${deleteIds.length} records`);
    });
})();
