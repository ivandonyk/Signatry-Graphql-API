import { getOrCreateConnection } from '../../typeorm';

import { UpdateResult } from 'typeorm';
import dayjs from 'dayjs';

import { FundTransaction } from '../../models';
import {
    convertRRuleFromString,
    getAllDatesArrayForRRule
} from '../../utilities/getRruleForRecurringActions';
import { TransactionStatusValue } from '../../models/TransactionStatus';

(async () => {
    console.log('amending contribution scheduledDate');

    const connection = await getOrCreateConnection();
    const fundTransactionRepo = connection.getRepository(FundTransaction);

    // fetch transactions
    const series = await fundTransactionRepo
        .createQueryBuilder('series')
        .leftJoinAndSelect('series.transactionRecurrence', 'transactionRecurrence')
        .leftJoin('series.transactionStatus', 'transactionStatus')
        .where("series.transactionCode LIKE 'CS-%'")
        .andWhere('transactionStatus.name != :canceled', {
            canceled: TransactionStatusValue.CANCELED
        })
        // instances has null dates
        .andWhere(qb => {
            const subQuery = qb
                .subQuery()
                .select('ft.originalFundTransactionId', 'series_id')
                .from(FundTransaction, 'ft')
                // missing date values
                .where('ft.scheduledDate IS NULL')
                // instances of a series
                .andWhere("ft.transactionCode LIKE 'C-%'")
                .andWhere('ft.originalFundTransactionId IS NOT NULL')
                .getQuery();

            return 'series.id IN ' + subQuery;
        })
        .getMany();

    // perform all updates in a transaction
    await connection.transaction(async manager => {
        const contributionUpdates: Promise<UpdateResult>[] = [];

        // helper function for updating dates
        function updateRecord(date: Date, contribution: FundTransaction) {
            contributionUpdates.push(
                manager
                    .createQueryBuilder()
                    .update(FundTransaction)
                    .set({ scheduledDate: date })
                    .where({ id: contribution.id })
                    .execute()
            );

            console.debug(
                `update ${contribution.transactionCode} with ${dayjs(date).toISOString()}`
            );
        }

        seriesLoop: for await (const originalContribution of series) {
            const instances = await fundTransactionRepo.find({
                where: { originalFundTransactionId: originalContribution.id },
                relations: ['transactionRecurrence']
            });

            // fetch indexes of invalid records
            const indexes: number[] = instances.reduce((acc, contribution, i) => {
                if (!contribution.scheduledDate) acc.push(i);

                return acc;
            }, []);

            if (!indexes.length) {
                console.log(`no invalid instances for ${originalContribution.transactionCode}`);
                continue seriesLoop;
            }

            indexLoop: for (const index of indexes) {
                const contribution = instances[index];
                // used in the log statements
                const loggingIdentifier = `${originalContribution.transactionCode}/${contribution.transactionCode}`;

                const recurrenceRule =
                    originalContribution.transactionRecurrence?.recurrenceRule ||
                    contribution.transactionRecurrence?.recurrenceRule;

                // if the series /instance doesn't have a recurrence rule, continue on
                if (!recurrenceRule) {
                    console.log(`no recurrence rule for ${loggingIdentifier}`);
                    continue indexLoop;
                }

                const rrule = convertRRuleFromString(recurrenceRule);
                const dates = getAllDatesArrayForRRule(
                    rrule,
                    (_d, index) => index <= instances.length - 1
                );

                const scheduledDate = dates[index];
                // if date doesn't exist, move on
                if (!scheduledDate) {
                    console.log(`no available date for ${loggingIdentifier}`);
                    continue indexLoop;
                }

                // check to see if there is a record with replacement date
                const dateAlreadyExists = instances.some(contribution => {
                    return dayjs(contribution.scheduledDate).isSame(scheduledDate, 'day');
                });

                // if date isn't taken, save contribution and move on
                if (!dateAlreadyExists) {
                    // update contribution
                    updateRecord(scheduledDate, contribution);
                    continue indexLoop;
                } else {
                    console.log(`conflict for ${loggingIdentifier}`);
                }
            } // end index loop
        } // end series loop

        console.log(`updating ${contributionUpdates.length} contributions`);
        await Promise.all(contributionUpdates);
    });

    console.log('thank you next');
})();
