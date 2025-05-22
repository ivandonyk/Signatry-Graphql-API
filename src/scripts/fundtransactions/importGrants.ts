import { getOrCreateConnection } from '../../typeorm';
import { Fund, FundTransaction, Recipient, TransactionType, UserProfile } from '../../models';
import { TransactionTypeValue } from '../../models/TransactionType';
import { createGrant } from '../../utilities/createGrant';
import { dayjs, parseFromFormat, formatDate } from '../../utilities/datetime';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';

export async function importGrants() {
    const connection = await getOrCreateConnection();

    const headers = {
        fundKey: 'FUND ID',
        recipientCode: 'RECIPIENT CODE',
        userCode: 'CREATED BY USER_CODE',
        amount: 'AMOUNT',
        recurrence: 'RECURRENCE',
        scheduledDate: 'SCHEDULED DATE',
        repeat: 'REPEAT',
        endDate: 'END DATE',
        includeFundName: 'INCLUDE FUND NAME',
        includeDonorName: 'INCLUDE DONOR NAME',
        includeDonorAddress: 'INCLUDE DONOR ADDRESS',
        specialRecognition: 'SPECIAL RECOGNITION',
        purposeCategory: 'PURPOSE CATEGORY',
        purposeNotes: 'PURPOSE NOTES',
        specialInstructions: 'SPECIAL INSTRUCTIONS',
        renTransactionId: 'Transaction ID ',
        renSeriesId: 'TRANSACTION SERIES (PARENT) REN ID'
    };

    const filename = 'import-files/grants.csv';
    const grantData = [];
    let totalCount = 0;

    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(path.resolve(filename))
                .pipe(csv.parse({ headers: true }))
                .on('error', error => reject(error))
                .on('data', row => {
                    const rowData = {};
                    for (const header in headers) {
                        rowData[header] = row[headers[header]];
                    }
                    grantData.push(rowData);
                    totalCount++;
                })
                .on('end', () => resolve(true));
        });
        console.log(`Successfully imported ${grantData.length} rows of account data`);
    } catch (error) {
        console.log('Error reading CSV');
        console.log(error);
        process.exit(1);
    }

    const fundRepo = connection.getRepository(Fund);
    const userRepo = connection.getRepository(UserProfile);
    const recipientRepo = connection.getRepository(Recipient);
    const fundTransactionRepo = connection.getRepository(FundTransaction);
    const grantTransactionType = await connection
        .getRepository(TransactionType)
        .findOne({ name: TransactionTypeValue.GRANT });
    const grantSeriesTransactionType = await connection
        .getRepository(TransactionType)
        .findOne({ name: TransactionTypeValue.GRANT_SERIES });
    let createdCount = 1;
    for (const data of grantData) {
        const parentTransaction = await fundTransactionRepo
            .createQueryBuilder('transaction')
            .innerJoin('transaction.fund', 'fund')
            .innerJoin('transaction.transactionInfo', 'transactionInfo')
            .innerJoin('transactionInfo.recipient', 'recipient')
            .where('fund.fundKey = :fundKey', { fundKey: data.fundKey })
            .andWhere('recipient.recipientCode = :recipientCode', {
                recipientCode: data.recipientCode
            })
            .getOne();
        if (!parentTransaction) {
            console.log(`Unable to find parent ${data.renSeriesId} for transaction`);
            return;
        }

        const [fund, user, recipient] = await Promise.all([
            fundRepo.findOne({ fundKey: data.fundKey }),
            userRepo.findOne({ id: data.userCode }),
            recipientRepo.findOne({ recipientCode: data.recipientCode })
        ]);
        if (!fund) {
            console.log(`Unable to create grant for fund ${data.fundKey}. Could not find fund.`);
            continue;
        }
        if (!user) {
            console.log(`Unable to create grant for user ${data.userCode}. Could not find user.`);
            continue;
        }
        if (!recipient) {
            console.log(
                `Unable to create grant for user ${data.recipientCode}. Could not find recipient.`
            );
            continue;
        }

        const recurringTimingMap = {
            'Every Other Week': 'Every-Other-Week',
            Monthly: 'Monthly',
            'Every Other Month': 'Every-Other-Month',
            Quarterly: 'Quarterly',
            'Semi Annually': 'Semi-Annually',
            Annually: 'Annually'
        };

        const parsedScheduledDate = parseFromFormat(data.scheduledDate, 'MM/DD/YYYY');
        const scheduledDate = dayjs(parsedScheduledDate)
            .add(12, 'hour')
            .toDate();
        const parsedEndDate =
            data.endDate !== '' ? parseFromFormat(data.endDate, 'MM/DD/YYYY') : null;
        const endDate = parsedEndDate
            ? dayjs(parsedEndDate)
                  .add(12, 'hour')
                  .toDate()
            : null;

        let recurringTiming = null;
        let oneTimeGrantTiming = null;
        if (data.recurrence === 'Recurring') {
            recurringTiming = {
                startOn: scheduledDate,
                repeat: recurringTimingMap[data.repeat],
                ends: endDate,
                numberOfRecurrences: null
            };
        } else if (data.recurrence === 'One Time') {
            oneTimeGrantTiming = { payBy: scheduledDate };
        }

        const grantInput = {
            fundId: fund.id,
            amount: data.amount,
            purposeCategory: data.purposeCategory,
            purposeNotes: data.purposeNotes,
            specialInstructions: data.specialInstructions,
            specialRecognition: data.specialRecognition,
            includeFundNameInRecognition: data.includeFundName,
            includeDonorNameInRecognition: data.includeDonorName,
            includeDonorAddressInRecognition: data.includeDonorAddress,
            recurringTiming: recurringTiming,
            oneTimeGrantTiming: oneTimeGrantTiming,
            originalFundTransactionId: parentTransaction ? parentTransaction.id : null,
            parentRecurrenceId: parentTransaction
                ? parentTransaction.transactionRecurrenceId
                : null,
            scheduledDate: scheduledDate
        };

        const transactionType =
            data.recurrence === 'Recurring' ? grantSeriesTransactionType : grantTransactionType;

        const grant = await createGrant(
            connection.manager,
            recipient.id,
            user.id,
            transactionType,
            grantInput,
            { skipTracking: true }
        );

        const metadata = grant.metadata ?? {};
        metadata['migratedTransactionId'] = data.renTransactionId;
        metadata['migratedTransactionSeriesId'] = data.renSeriesId;
        grant.metadata = metadata;
        grant.scheduledDate = scheduledDate;

        await fundTransactionRepo.save(grant);

        console.log(
            `${createdCount} / ${totalCount} - Created grant ${grant.transactionCode} for fund ${fund.fundKey}`
        );
        createdCount++;
    }

    return { totalCount: totalCount, createdCount: createdCount };
}
