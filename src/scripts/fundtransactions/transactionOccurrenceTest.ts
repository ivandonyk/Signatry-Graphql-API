import { getOrCreateConnection } from '../../typeorm';
import * as csv from 'fast-csv';
import fs from 'fs';
import path from 'path';
import { RRule } from 'rrule';
import { FundTransaction } from '../../models';
import { TransactionStatusValue } from '../../models/TransactionStatus';
import { TransactionTypeValue } from '../../models/TransactionType';
import {
  _30DayRangeRRule
} from '../../utilities/getRruleForRecurringActions';
import dayjs from 'dayjs';

interface Row {
  seriesTransactionId: string;
  seriesTransactionCode: string;
  fund: string;
  amount: string;
  recipient: string;
  startDate: string;
  recurrenceRule: string;
  nextOccurrence: string;
}

async function transactionOccurrenceTest() {
  console.log('beginning transactionOccurrenceTest')
  console.time('transactionOccurrenceTest')
  const connection = await getOrCreateConnection();
  const fundTransactionRepo = connection.getRepository(FundTransaction);

  /* 
    Get all GRANT_SERIES fund_transactions that:
    - are not canceled
    - are not historic
    - have the associated recurrence record enabled
  */
  const grantSeries = await fundTransactionRepo
    .createQueryBuilder('fundTransaction')
    .innerJoinAndSelect('fundTransaction.transactionType', 'transactionType')
    .innerJoinAndSelect('fundTransaction.transactionStatus', 'transactionStatus')
    .innerJoinAndSelect('fundTransaction.transactionRecurrence', 'transactionRecurrence')
    .innerJoinAndSelect('fundTransaction.transactionInfo', 'transactionInfo')
    .innerJoinAndSelect('transactionInfo.recipient', 'recipient')
    .innerJoinAndSelect('fundTransaction.fund', 'fund')
    .where('transactionType.name = :grantType', {
      grantType: TransactionTypeValue.GRANT_SERIES
    })
    .andWhere('fundTransaction.isHistoric = false')
    .andWhere('transactionRecurrence.enabled = true')
    .andWhere('transactionStatus.name != :canceled', {
      canceled: TransactionStatusValue.CANCELED
    })
    .getMany();
  console.timeLog('transactionOccurrenceTest', grantSeries.length, 'grants fetched')

  const upcomingOccurrencesToCreate: Row[] = [];

  /* 
    For each GRANT_SERIES fund_transaction get all occurrences scheduled to happen in the next 30 days.
    We use rrule.js to parse the RRULE strings for each fund_transaction's transaction_recurrence record.
  */
  for (let i = 0; i < grantSeries.length; i++) {
    // @ts-ignore
    process.stdout.cursorTo(0);
    process.stdout.write(`checking series: ${i}`);

    const grant = grantSeries[i]

    /* 
      It appears in some cases our RRULE records are deleted and recreated for a given Grant Series.
      This can result in inaccurate DTSTART values in the RRULE string, which in turn can produce inconsistent occurrence schedules.
      To help compensate for changing DTSTART values (and possibly also to acommodate manually created grant occurrences that may have been off schedule but intended to "restart" the schedule),
      we get the most recent occurrence for the series and consider that occurrence's scheduled_date as the DTSTART for the series.
    */
    const rruleOptions = RRule.parseString(grant.transactionRecurrence.recurrenceRule)
    try {
      const mostRecentTransaction = await fundTransactionRepo
        .createQueryBuilder('fundTransaction')
        .where('fundTransaction.originalFundTransactionId = :originalFundTransactionId', { originalFundTransactionId: grant.id })
        .andWhere('fundTransaction.scheduledDate is not null')
        .orderBy('fundTransaction.scheduledDate', 'DESC')
        .getOne()
      rruleOptions.dtstart = mostRecentTransaction.scheduledDate
    } catch (e) {
      // No occurrence has been created yet for this series, keep the original DTSTART date for the rule
    }
    const rrule = new RRule(rruleOptions)
    const upcomingOccurrences = _30DayRangeRRule(rrule)

    /* 
      For each upcoming occurrence in a GRANT_SERIES (within the next 30 days), check to see if the occurrence has been created yet.
      If not, add it to the list of occurrences that need to be created.
    */
    for (const occurrence of upcomingOccurrences) {
      // When searching for existing occurrences, cast the scheduled_date to ::date in order to omit exact time.
      const existingOccurrence: { exists: boolean }[] = await connection.manager.query(
        `select exists(select 1 from fund_transaction where original_fund_transaction_id = $1 and scheduled_date::date >= $2 and scheduled_date::date <= $3)`,
        [grant.id, dayjs(occurrence).subtract(2, 'day').format('YYYY-MM-DD'), dayjs(occurrence).add(2, 'day').format('YYYY-MM-DD')]
      )

      if (!existingOccurrence[0]?.exists) {
        // No existing occurrence found for this date! Add it to the list of ones that need to be created.
        upcomingOccurrencesToCreate.push({
          seriesTransactionId: grant.id,
          seriesTransactionCode: grant.transactionCode,
          fund: grant.fund.fundKey,
          amount: grant.amount.toString(),
          recipient: grant.transactionInfo.recipient.name,
          startDate: rrule.options.dtstart.toString(),
          recurrenceRule: grant.transactionRecurrence.recurrenceRule,
          nextOccurrence: occurrence.toString(),
        })
      }
    }
  }

  const file = path.resolve(__dirname, 'transactionOccurrenceTest.csv');
  const writeStream = fs.createWriteStream(file, { flags: 'w' });

  csv.write(upcomingOccurrencesToCreate.map(o => Object.values(o)), {
    headers: ['Grant Series ID', 'Grant Series Code', 'Fund',
      'Amount',
      'Recipient',
      'Start Date',
      'Recurrence Rule',
      'Upcoming Occurrences']
  })
    .pipe(writeStream)
    .on('error', (err: Error) => console.error('Error writing CSV: ', err))
    .on('finish', () => {
      // @ts-ignore
      process.stdout.cursorTo(0);
      console.log(`Checked ${grantSeries.length} series. Finished writing ${upcomingOccurrencesToCreate.length} occurrences to ${file}`)
      console.timeEnd('transactionOccurrenceTest')
    });
}

transactionOccurrenceTest();

