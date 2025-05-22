import { getOrCreateConnection } from '../../typeorm';
import { dayjs, formatDate } from '../../utilities/datetime';
import * as csv from 'fast-csv';
import fs from 'fs';
import path from 'path';
import RRule from 'rrule';
import { FundTransaction } from '../../models';
import { TransactionStatusValue } from '../../models/TransactionStatus';
import { TransactionTypeValue } from '../../models/TransactionType';
import {
    convertRRuleToHumanReadable,
    convertRRuleFromString,
    getAllDatesArrayForRRule
} from '../../utilities/getRruleForRecurringActions';

interface Row {
    seriesTransactionCode: string;
    fund: string;
    amount: string;
    startDate: string;
    recurrenceRule: string;
    frequency: number;
    unit: string;
    until: string;
    totalTimes: string;
    paymentType: string;
    blank1: string;
    totalExpectedInstances: string;
    totalInstances: string;
    instancesDifference: string;
    blank2: string;
    expectedInstanceDates: string;
    blank3: string;
    instanceCode: string;
    instanceScheduledDate: string;
    instanceAmount: string;
    instanceStatus: string;
}

async function createContributionSeriesReport() {
    const connection = await getOrCreateConnection();
    const fundTransactionRepo = connection.getRepository(FundTransaction);

    const contributionSeries = await fundTransactionRepo
        .createQueryBuilder('fundTransaction')
        .innerJoinAndSelect('fundTransaction.transactionType', 'transactionType')
        .innerJoinAndSelect('fundTransaction.transactionStatus', 'transactionStatus')
        .innerJoinAndSelect('fundTransaction.transactionRecurrence', 'transactionRecurrence')
        .innerJoinAndSelect('fundTransaction.fund', 'fund')
        .where('transactionType.name = :contributionType', {
            contributionType: TransactionTypeValue.CONTRIBUTION_SERIES
        })
        .andWhere('fundTransaction.isHistoric = false')
        .andWhere('transactionRecurrence.enabled = true')
        .andWhere('transactionStatus.name != :canceled', {
            canceled: TransactionStatusValue.CANCELED
        })
        .getMany();

    const headers = {
        seriesTransactionCode: 'Contribution Series Code',
        fund: 'Fund',
        amount: 'Amount',
        startDate: 'Start Date',
        recurrenceRule: 'Recurrence Rule',
        frequency: 'Frequency',
        unit: 'Unit',
        until: 'End Date',
        totalTimes: 'Total Times',
        paymentType : 'Payment Type',
        blank1: '',
        totalExpectedInstances: 'Total Expected Instances',
        totalInstances: 'Total Instances',
        instancesDifference: 'Difference',
        action: 'Action',
        value: 'Value',
        blank2: '',
        expectedInstanceDate: 'Expected Instance Date',
        instanceScheduledDate: 'Existing Instance Scheduled Date',
        sameDate: 'Same Date?',
        blank3: '',
        instanceCode: 'Existing Instance Code',
        instanceAmount: 'Existing Instance Amount',
        instanceStatus: 'Existing Instance Status'
    };

    const rows = [] as Row[];

    for (const contribution of contributionSeries) {
        const instances = await fundTransactionRepo
            .createQueryBuilder('fundTransaction')
            .innerJoinAndSelect('fundTransaction.transactionStatus', 'transactionStatus')
            .innerJoinAndSelect('fundTransaction.transactionType', 'transactionType')
            .where('fundTransaction.originalFundTransactionId = :seriesId', {
                seriesId: contribution.id
            })
            .andWhere('transactionType.name = :contributionType', {
                contributionType: TransactionTypeValue.CONTRIBUTION
            })
            .orderBy('fundTransaction.scheduledDate', 'ASC')
            .getMany();
        const recurrenceRule = contribution.transactionRecurrence.recurrenceRule;
        const rule = RRule.parseString(recurrenceRule);
        const frequency = rule.interval;
        const unit = RRule.FREQUENCIES[rule.freq];
        const until = rule.until !== undefined ? formatDate(rule.until, 'MM-DD-YYYY') : '';
        const count = rule.count !== undefined ? rule.count.toString() : '';
        const rrule = convertRRuleFromString(recurrenceRule);
        const readableRule = convertRRuleToHumanReadable(rrule);
        const paymentType = contribution.metadata && contribution.metadata.paymentDetails  ?
          contribution.metadata.paymentDetails.paymentType :
          '';
        const endDate = dayjs()
            .add(30, 'day')
            .endOf('day')
            .toDate();
        const expectedInstanceDates = getAllDatesArrayForRRule(
            rrule,
            date => date < endDate
        ).map(date => formatDate(date, 'MM-DD-YYYY'));
        const numberOfExpectedInstances = expectedInstanceDates.length;
        const numberOfInstances = instances.length;
        const difference = numberOfExpectedInstances - numberOfInstances;

        // Need to iterate over either the number of actual instances or number of expected, whichever is greater
        for (let i = 0; i < (difference > 0 ? numberOfExpectedInstances : numberOfInstances); i++) {
            const row = {} as Row;
            row['seriesTransactionCode'] = contribution.transactionCode;
            row['fund'] = contribution.fund.fundKey;
            row['amount'] = contribution.amount.toString();
            row['startDate'] = expectedInstanceDates[0];
            row['recurrenceRule'] = readableRule;
            row['frequency'] = frequency;
            row['unit'] = unit.toLowerCase();
            row['until'] = until;
            row['totalTimes'] = count;
            row['paymentType'] = paymentType;
            row['totalExpectedInstances'] = numberOfExpectedInstances.toString();
            row['totalInstances'] = numberOfInstances.toString();
            row['instancesDifference'] = difference.toString();
            row['expectedInstanceDate'] = expectedInstanceDates[i] ?? '';
            if (typeof instances[i] !== 'undefined') {
                const instance = instances[i];
                row['instanceCode'] = instance.transactionCode;
                row['instanceStatus'] = instance.transactionStatus.name;
                row['instanceAmount'] = instance.amount.toString();
                if (instance.scheduledDate) {
                    row['instanceScheduledDate'] = formatDate(instance.scheduledDate, 'MM-DD-YYYY');
                    if (row['expectedInstanceDate'] !== '') {
                        row['sameDate'] =
                            expectedInstanceDates[i] ===
                            formatDate(instance.scheduledDate, 'MM-DD-YYYY')
                                ? 'true'
                                : 'false';
                    } else {
                        row['sameDate'] = '';
                    }
                } else {
                    row['instanceScheduledDate'] = 'Not available';
                    row['sameDate'] = '';
                }
            } else {
                row['instanceCode'] = '';
                row['instanceScheduledDate'] = '';
                row['instanceAmount'] = '';
                row['instanceStatus'] = '';
            }

            rows.push(row);
        }
        // Add blank row to visually separate each series' data
        const blankRow = {} as Row;
        Object.keys(headers).forEach(header => (blankRow['header'] = ''));
        rows.push(blankRow);
    }
    const file = path.resolve(__dirname, 'contributionSeriesReport.csv');
    const writeStream = fs.createWriteStream(file, { flags: 'w' });
    const data = rows.map(row => [
        row['seriesTransactionCode'],
        row['fund'],
        row['amount'],
        row['startDate'],
        row['recurrenceRule'],
        row['frequency'],
        row['unit'],
        row['until'],
        row['totalTimes'],
        row['paymentType'],
        row['blank1'],
        row['totalExpectedInstances'],
        row['totalInstances'],
        row['instancesDifference'],
        '',
        '',
        row['blank2'],
        row['expectedInstanceDate'],
        row['instanceScheduledDate'],
        row['sameDate'],
        row['blank3'],
        row['instanceCode'],
        row['instanceAmount'],
        row['instanceStatus']
    ]);

    csv.write(data, { headers: Object.values(headers) })
        .pipe(writeStream)
        .on('error', (err: Error) => console.error('Error writing CSV: ', err))
        .on('finish', () => console.log(`Finished writing ${data.length} records to ${file}`));
}
createContributionSeriesReport();
