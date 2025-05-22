import { getOrCreateConnection } from '../../typeorm';

import * as csv from 'fast-csv';
import fs from 'fs';
import path from 'path';
import RRule from 'rrule';
import dayjs from 'dayjs';

import { FundTransaction } from '../../models';
import {
    convertRRuleFromString,
    convertRRuleToHumanReadable,
    getAllDatesArrayForRRule
} from '../../utilities/getRruleForRecurringActions';
import { TransactionTypeValue } from '../../models/TransactionType';

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
    console.log('generating csv');

    const connection = await getOrCreateConnection();
    const fundTransactionRepo = connection.getRepository(FundTransaction);

    const file = path.resolve(__dirname, 'all.csv');
    /**
     * @note you can pass `contribution` as an argument to generate a contribution series.
     * default to grant, since that's run more often
     */
    const [typeArg] = process.argv.slice(2);
    const isContribution = typeArg && typeArg.toLowerCase().includes('contribution');
    const seriesType = isContribution
        ? TransactionTypeValue.CONTRIBUTION_SERIES
        : TransactionTypeValue.GRANT_SERIES;
    const instanceType = isContribution
        ? TransactionTypeValue.CONTRIBUTION
        : TransactionTypeValue.GRANT;

    if (typeArg && !typeArg.toLowerCase().includes('contribution')) {
        console.log('to generate a contributions report pass `contribution` as an argument');
    }

    /** @todo make more DRY */

    // fetch series
    const series = await fundTransactionRepo
        .createQueryBuilder('series')
        .leftJoin('series.transactionType', 'transactionType')
        .leftJoinAndSelect('series.transactionStatus', 'seriesStatus')
        .leftJoinAndSelect('series.fund', 'fund')
        .leftJoinAndSelect('series.recurringFundTransactions', 'instances')
        .leftJoinAndSelect('instances.transactionRecurrence', 'instanceRecurrence')
        .leftJoinAndSelect('instances.transactionStatus', 'instanceStatus')
        .leftJoinAndSelect('instances.transactionInfo', 'transactionInfo')
        .leftJoinAndSelect('transactionInfo.recipient', 'recipient')
        .where('transactionType.name = :type', { type: seriesType })
        .andWhere('series.isHistoric <> true')
        .getMany();

    // fetch series
    const oneTimers = await fundTransactionRepo
        .createQueryBuilder('grant')
        .leftJoin('grant.transactionType', 'transactionType')
        .leftJoinAndSelect('grant.fund', 'fund')
        .leftJoinAndSelect('grant.transactionStatus', 'seriesStatus')
        .leftJoinAndSelect('grant.transactionInfo', 'transactionInfo')
        .leftJoinAndSelect('transactionInfo.recipient', 'recipient')
        .where('transactionType.name = :type', { type: instanceType })
        .andWhere('grant.isHistoric <> true')
        .andWhere('grant.originalFundTransactionId IS NULL')
        .getMany();

    const data: Data[] = [];

    const formatDate = (date: Date): string => dayjs(date).toISOString();
    const formatData = (ft: FundTransaction, originalTransaction?: FundTransaction): Data => {
        const isSeries = Boolean(ft.transactionRecurrence);
        let rrule: RRule;
        let rule: string;
        let startDate: string;

        if (ft.transactionRecurrence?.recurrenceRule) {
            rrule = convertRRuleFromString(ft.transactionRecurrence.recurrenceRule);
            rule = convertRRuleToHumanReadable(rrule);
            startDate = formatDate(getAllDatesArrayForRRule(rrule, (_d, i) => i === 0)[0]);
        }

        // console.log({ isSeries, ft });

        return {
            seriesCode: originalTransaction?.transactionCode || '--',
            code: ft.transactionCode,
            date: ft.scheduledDate ? formatDate(ft.scheduledDate) : 'NO SCHEDULED DATE',
            status: ft.transactionStatus.name,
            seriesStatus: originalTransaction?.transactionStatus?.name || '--',
            startDate: startDate || 'NO RECURRENCE RULE',
            rule: rule || 'NO RECURRENCE RULE',
            amount: ft.amount,
            fund: (isSeries ? originalTransaction : ft).fund?.name || '--',
            fundCode: (isSeries ? originalTransaction : ft).fund?.fundKey || '--',
            recipient: ft.transactionInfo?.recipient?.name || 'NO RECIPIENT',
            recipientId: ft.transactionInfo?.recipient?.recipientCode || 'NO RECIPIENT',
            createdOn: formatDate(ft.createdOn),
            updatedOn: formatDate(ft.updatedOn),
            purposeNotes: ft.transactionInfo?.purposeNotes || '--'
        };
    };

    /** @note comment out one of the below iterators depending on client's request */
    series.forEach((originalTransaction) => {
        originalTransaction.recurringFundTransactions.forEach((ft) =>
            data.push(formatData(ft, originalTransaction))
        );
    });
    oneTimers.forEach((grant) => data.push(formatData(grant)));

    // generate csv
    const writeStream = fs.createWriteStream(file, { flags: 'w' });

    csv.write(data, { headers: true })
        .pipe(writeStream)
        .on('error', (err: Error) => console.error('error in csv: ', err))
        .on('finish', () => console.log(`finished writing ${data.length} records to ${file}`));
})();
