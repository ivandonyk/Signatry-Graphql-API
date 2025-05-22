/** @note test script to run one-off queries */
import { getOrCreateConnection } from '../../typeorm';

import dayjs from 'dayjs';
import * as csv from 'fast-csv';
import fs from 'fs';
import path from 'path';
import RRule from 'rrule';

import { FundTransaction } from '../../models';
import {
    convertRRuleToHumanReadable,
    convertRRuleFromString,
    getAllDatesArrayForRRule
} from '../../utilities/getRruleForRecurringActions';
import { TransactionTypeValue } from '../../models/TransactionType';
import { TransactionStatusValue } from '../../models/TransactionStatus';

interface Data {
    seriesCode: string;
    code: string;
    date: string;
    startDate: string;
    status: string;
    seriesStatus: string;
    rule: string;
    amount: number;
    fund: string;
    fundCode: string;
    recipient: string;
    recipientId: string;
    createdOn: string;
    updatedOn: string;
    purposeNotes: string;
}

(async () => {
    const connection = await getOrCreateConnection();
    const fundTransactionRepo = connection.getRepository(FundTransaction);

    const query = fundTransactionRepo
        .createQueryBuilder('series')
        .leftJoinAndSelect('series.transactionRecurrence', 'transactionRecurrence')
        .leftJoinAndSelect('series.fund', 'fund')
        .leftJoinAndSelect('series.transactionInfo', 'transactionInfo')
        .leftJoinAndSelect('transactionInfo.recipient', 'recipient')
        .leftJoinAndSelect('series.transactionStatus', 'transactionStatus')
        .leftJoin('series.transactionType', 'transactionType')
        .where('transactionType.name IN (:...types)', {
            types: [TransactionTypeValue.GRANT_SERIES]
        })
        .andWhere('series.isHistoric <> true')
        .andWhere('transactionStatus.name <> :canceled', {
            canceled: TransactionStatusValue.CANCELED
        })
        .andWhere('transactionRecurrence.enabled = true')
        // without instances
        .andWhere(qb => {
            const subQuery = qb
                .subQuery()
                .select('ftSub.originalFundTransactionId', 'series_id')
                .from(FundTransaction, 'ftSub')
                .leftJoin('ftSub.transactionType', 'ttSub')
                .where('ttSub.name = :grant', { grant: TransactionTypeValue.GRANT })
                .andWhere('ftSub.originalFundTransactionId IS NOT NULL')
                .getQuery();

            return 'series.id NOT IN ' + subQuery;
        });

    const series = await query.getMany();

    const data: Data[] = [];

    const formatDate = (date: Date): string => dayjs(date).format('YYYY-MM-DD');

    
    series.forEach(grantSeries => {
        let rrule: RRule;
        let rule: string;
        let startDate: string;
        if (grantSeries.transactionRecurrence?.recurrenceRule) {
            rrule = convertRRuleFromString(grantSeries.transactionRecurrence.recurrenceRule);
            rule = convertRRuleToHumanReadable(rrule);
            startDate = formatDate(getAllDatesArrayForRRule(rrule, (_d, i) => i === 0)[0]);
        }

        data.push({
            seriesCode: grantSeries?.transactionCode,
            code: '--',
            date: grantSeries.scheduledDate ? formatDate(grantSeries.scheduledDate) : 'NO SCHEDULED DATE',
            status: grantSeries.transactionStatus.name,
            seriesStatus: grantSeries?.transactionStatus?.name || '--',
            startDate: startDate || 'NO RECURRENCE RULE',
            rule,
            amount: grantSeries.amount,
            fund: grantSeries.fund?.name || '--',
            fundCode: grantSeries.fund?.fundKey || '--',
            recipient: grantSeries.transactionInfo?.recipient?.name || 'NO RECIPIENT',
            recipientId: grantSeries.transactionInfo?.recipient?.recipientCode || 'NO RECIPIENT',
            createdOn: formatDate(grantSeries.createdOn),
            updatedOn: formatDate(grantSeries.updatedOn),
            purposeNotes: grantSeries.transactionInfo?.purposeNotes || '--'
        });
    });

    // generate csv
    const file = path.resolve(__dirname, 'audit.csv');
    const writeStream = fs.createWriteStream(file, { flags: 'w' });

    csv.write(data, { headers: true })
        .pipe(writeStream)
        .on('error', (err: Error) => console.error('error in csv: ', err))
        .on('finish', () => console.log(`finished writing ${data.length} records to ${file}`));
})();
