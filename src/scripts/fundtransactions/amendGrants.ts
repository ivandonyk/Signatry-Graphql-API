import { getOrCreateConnection } from '../../typeorm';

import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import { finished } from 'stream';
import { FindConditions, In, UpdateResult } from 'typeorm';
import dayjs from 'dayjs';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import rrule, { Options, rrulestr } from 'rrule';

import {
    FundTransaction,
    FundTransactionComment,
    FundTransactionDetail,
    FundTransactionInfo,
    TransactionEvent,
    TransactionRecurrence,
    TransactionStatus,
    TransactionType
} from '../../models';
import { TransactionStatusValue } from '../../models/TransactionStatus';
import { convertRRuleFromString } from '../../utilities/getRruleForRecurringActions';
import { TransactionTypeValue } from '../../models/TransactionType';
import { transformRecurrenceRecordIntoCreateGrantInput } from '../../utilities/transformGrantRefIntoCreateGrantInput';
import { createGrant } from '../../utilities/createGrant';

type action =
    | 'change status'
    | 'change scheduled date'
    | 'delete grant'
    | 'create instance'
    | 'change start date';
interface Row {
    flag: 'i' | 'a' | '';
    action: action | string;
    value: string; // scheduledDate
    notes: string;
    code: string; // transactionCode
    seriesCode: string;
}

function getMiddayDate(date: string): Date {
    return dayjs(date)
        .startOf('day')
        .add(12, 'hour')
        .toDate();
}

(async () => {
    console.log('updating some grants');

    const { manager } = await getOrCreateConnection();
    const fundTransactionRepo = manager.getRepository(FundTransaction);

    const file = path.resolve(
        __dirname,
        '../../../',
        'release-scripts',
        'data',
        'createMissingGrants.csv'
    );

    const grantUpdates: {
        transactionCode: string;
        scheduledDate?: Date;
        status?: TransactionStatusValue;
    }[] = [];
    const deleteCodes: string[] = [];
    const recurrenceUpdates: {
        startDate: Date;
        seriesCode: string;
    }[] = [];
    const creates: {
        scheduledDate: Date;
        seriesCode: string;
    }[] = [];

    // stream csv into array
    const stream = fs
        .createReadStream(file)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
            console.error(error);
            process.exit(0);
        })
        .on('data', (row: Row) => {
            // check actions first
            const actions = row.action
                .split(';')
                .map(action => action.trim().toLowerCase()) as action[];

            actions.forEach(action => {
                const index = grantUpdates.findIndex(update => update.transactionCode === row.code);

                switch (action) {
                    case 'change scheduled date':
                        const scheduledDate = getMiddayDate(row.value);

                        if (index > -1) grantUpdates[index].scheduledDate = scheduledDate;
                        else grantUpdates.push({ transactionCode: row.code, scheduledDate });
                        break;

                    case 'change status':
                        // 2 pathways to parse status
                        let value: TransactionStatusValue;
                        if (/Need to remove divestment/.test(row.notes)) {
                            // update value
                            value = TransactionStatusValue[row.value.replace(' ', '_')];
                            if (!value) {
                                console.log(
                                    `Invalid value for record ${row.code} parsed from "${row.value}"`
                                );
                                break;
                            }
                            if (index > -1) grantUpdates[index].status = value;
                            else grantUpdates.push({ transactionCode: row.code, status: value });
                        } else if (/Change to/.test(row.notes)) {
                            const status = row.notes.split('Change to ')[1];
                            value = TransactionStatusValue[status.replace(' ', '_')];

                            if (!value) {
                                console.log(
                                    `Invalid value for record ${row.code} parsed from "${row.notes}"`
                                );
                                break;
                            }

                            if (index > -1) grantUpdates[index].status = value;
                            else grantUpdates.push({ transactionCode: row.code, status: value });
                        } else {
                            console.log(`invalid note ${row.notes} for ${row.code}`);
                        }
                        break;

                    case 'delete grant':
                        deleteCodes.push(row.code);
                        break;

                    case 'create instance':
                        creates.push({
                            scheduledDate: getMiddayDate(row.value),
                            seriesCode: row.seriesCode
                        });
                        break;

                    case 'change start date':
                        recurrenceUpdates.push({
                            startDate: getMiddayDate(row.value),
                            seriesCode: row.code
                        });
                        break;
                }
            });
        });

    finished(stream, async err => {
        if (err) {
            console.error('error finishing stream', err);
            return;
        }

        // delete fund transaction and associated records
        if (deleteCodes.length) {
            console.log('Deleting...');
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
        }

        // update fundTransaction records
        let grantUpdateResults: UpdateResult[] = [];
        if (grantUpdates.length) {
            console.log('Updating fund transactions...');
            // fetch all statuses
            const statuses = await manager.getRepository(TransactionStatus).find();

            const grantPromises: Promise<UpdateResult>[] = [];

            grantUpdates.forEach(update => {
                const status = update.status
                    ? statuses.find(status => status.name === update.status)
                    : undefined;

                if (update.status && !status) {
                    console.log(`unable to find ${update.status} for ${update.transactionCode}`);
                }

                const set: QueryDeepPartialEntity<FundTransaction> = Object.assign(
                    {},
                    update.scheduledDate ? { scheduledDate: update.scheduledDate } : {},
                    status ? { transactionStatusId: status.id } : {}
                );

                grantPromises.push(
                    manager
                        .createQueryBuilder()
                        .update(FundTransaction)
                        .set(set)
                        .where({ transactionCode: update.transactionCode })
                        .returning(['id', 'scheduledDate'])
                        .updateEntity(true)
                        .execute()
                );
            });

            grantUpdateResults = await Promise.all(grantPromises);

            // update info requestedProcessDate
            const infoPromises: Promise<UpdateResult>[] = [];
            grantUpdateResults.forEach((result, i) => {
                if (!result.raw.length) {
                    console.log(`unable to update dates for ${grantUpdates[i].transactionCode}`);
                    return;
                }

                const { id, scheduled_date } = result.raw[0];

                if (scheduled_date) {
                    infoPromises.push(
                        manager
                            .createQueryBuilder()
                            .update(FundTransactionInfo)
                            .set({ requestedProcessDate: scheduled_date })
                            .where({ fundTransactionId: id })
                            .execute()
                    );
                }
            });

            await Promise.all(infoPromises);
        }

        // update transactionRecurrence records
        if (recurrenceUpdates.length) {
            console.log('Updating transactions recurrence...');
            const recurrencePromises: Promise<UpdateResult>[] = [];
            // fetch ft records
            const recurrenceRecordsToUpdate: {
                fundTransaction: FundTransaction;
                startDate: Date;
            }[] = await Promise.all(
                recurrenceUpdates.map(({ seriesCode, startDate }) => {
                    return fundTransactionRepo
                        .findOne({
                            where: { transactionCode: seriesCode },
                            relations: ['transactionRecurrence'],
                            select: ['id', 'transactionCode', 'transactionRecurrence']
                        })
                        .then(ft => ({
                            fundTransaction: ft,
                            startDate
                        }));
                })
            );

            recurrenceRecordsToUpdate.forEach(({ fundTransaction, startDate }) => {
                // fetch original rule
                const originalRule = rrulestr(fundTransaction.transactionRecurrence.recurrenceRule);
                const recurrenceRule = new rrule({
                    ...(originalRule.origOptions as Options),
                    dtstart: startDate
                }).toString();

                recurrencePromises.push(
                    manager
                        .createQueryBuilder()
                        .update(TransactionRecurrence)
                        .set({ recurrenceRule })
                        .where({ id: fundTransaction.transactionRecurrence.id })
                        .execute()
                );
            });

            await Promise.all(recurrencePromises);
        }

        // create grants for series
        const createdGrants: string[] = [];
        if (creates.length) {
            console.log('Creating grants....');
            // fetch series and grant type
            const query = manager
                .getRepository(FundTransaction)
                .createQueryBuilder('ft')
                .leftJoinAndSelect('ft.transactionRecurrence', 'transactionRecurrence')
                .leftJoinAndSelect('ft.transactionInfo', 'transactionInfo')
                .leftJoinAndSelect('ft.recurringFundTransactions', 'recurringFundTransactions');

            const seriesRecordsToCreate: {
                series: FundTransaction;
                scheduledDate: Date;
            }[] = await Promise.all(
                creates.map(({ seriesCode, scheduledDate }) => {
                    return query
                        .andWhere('ft.transactionCode = :transactionCode', {
                            transactionCode: seriesCode
                        })
                        .getOne()
                        .then(ft => ({
                            series: ft,
                            scheduledDate: scheduledDate
                        }));
                })
            );

            const transactionType = await manager.findOne(TransactionType, {
                name: TransactionTypeValue.GRANT
            });

            let i = 0;
            for await (const { series, scheduledDate } of seriesRecordsToCreate) {
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
                    continue;
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

                if (createdGrant) createdGrants.push(createdGrant.transactionCode);
                i++;
            }
        }

        if (grantUpdateResults.length) {
            console.log(`updated ${grantUpdateResults.length} grants\n`);
        }
        if (deleteCodes.length) {
            console.log(`deleted ${deleteCodes.length} grants\n`);
        }
        if (grantUpdates.length) {
            console.log(
                `list of updated grants: ${grantUpdates.map(u => u.transactionCode).join(',')}\n`
            );
        }
        if (recurrenceUpdates.length) {
            console.log(
                `list of updated recurrence rules: ${recurrenceUpdates
                    .map(item => item.seriesCode)
                    .join(',')}\n`
            );
        }
        if (createdGrants.length) {
            console.log(`list of created grants: ${createdGrants.join(',')}`);
        }
    });
})();
