import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as path from 'path';
import { processRecurringContributions } from '../../../src/cron/recurring-transactions/initiateRecurringAndFutureContributions';
import { TransactionStatusValue } from '../../../src/models/TransactionStatus';
import {
    createContributionFromSeries,
    createContribution
} from '../../../src/utilities/createContribution';
import { finished } from 'stream';
import { FindConditions, In, Repository } from 'typeorm';
import {
    FundTransaction,
    FundTransactionComment,
    FundTransactionDetail,
    FundTransactionInfo,
    TransactionEvent,
    TransactionStatus
} from '../../../src/models';
import { getOrCreateConnection } from '../../../src/typeorm';

const oneTimeFile = path.resolve(
    __dirname,
    '../../..',
    'release-scripts',
    'data',
    'TS-1962-one-time-contributions.csv'
);
const seriesFile = path.resolve(
    __dirname,
    '../../..',
    'release-scripts',
    'data',
    'TS-1962-series-contributions.csv'
);

const createSeriesTransactions = async (manager, createSeriesCodes) => {
    const newC: string[] = [];
    const invalid: { seriesCode: string; error: any }[] = [];
    for await (const seriesCode of createSeriesCodes) {
        try {
            const contribution = await createContributionFromSeries(seriesCode, manager);
            newC.push(contribution.transactionCode);
        } catch (error) {
            console.log(error);
            invalid.push({ seriesCode, error });
        }
    }
    return { newC, invalid };
};

const createTransactions = async (
    manager,
    fundTransactionRepo: Repository<FundTransaction>,
    createCodes
) => {
    for await (const item of createCodes) {
        const { transaction_type, transaction_code } = item;
        const condition: FindConditions<FundTransaction> = {
            transactionCode: In(transaction_code)
        };
        try {
            const existingTransaction = await fundTransactionRepo.findOne(condition);
            const { fundId, amount, createdByProfile } = existingTransaction;
            const userProfileId = createdByProfile.id;
            const userProfileAccountId = existingTransaction.createdByProfile.userProfileAccounts.find(
                acct => acct.isPrimary
            ).id;
            const input = {
                fundId,
                userProfileAccountId,
                amount,
                recurringTiming: null,
                oneTimeGrantTiming: null,
                originalFundTransactionId: null
            };
            await createContribution(
                manager,
                userProfileId,
                userProfileAccountId,
                transaction_type,
                input
            );
        } catch (error) {
            console.log(error);
        }
    }
};

const cancelTransactions = async (manager, fundTransactionRepo, cancelCodes) => {
    const cancelStatus = await manager.findOne(TransactionStatus, {
        name: TransactionStatusValue.CANCELED
    });
    await fundTransactionRepo.update(
        { transactionCode: In(cancelCodes) },
        { transactionStatusId: cancelStatus.id }
    );
};

const deleteTransactions = async (manager, fundTransactionRepo, deleteCodes) => {
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
};

const makeChanges = async parsedData => {
    const { deleteCodes, cancelCodes, createCodes, createSeriesCodes } = parsedData;
    const connection = await getOrCreateConnection();
    const { manager } = connection;
    const fundTransactionRepo = manager.getRepository(FundTransaction);

    await deleteTransactions(manager, fundTransactionRepo, deleteCodes);
    await cancelTransactions(manager, fundTransactionRepo, cancelCodes);
    createTransactions(manager, fundTransactionRepo, createCodes);
    const { newC, invalid } = await createSeriesTransactions(manager, createSeriesCodes);

    await processRecurringContributions(connection);

    console.log(`
              deleted ${deleteCodes.length} contributions: ${deleteCodes.join(',')}
              canceled ${cancelCodes.length} contributions: ${cancelCodes.join(',')}
              created ${newC.length} contributions: ${newC.join(',')}
              unable to create ${invalid.length} contributions: ${invalid
        .map(s => `series: ${s.seriesCode}\nerror:${s.error}`)
        .join('\n')}
              `);
};

const getActions = (row, changes) => {
    const { deleteCodes, cancelCodes, createCodes, createSeriesCodes } = changes;
    const actions = row.Action.split('/').map(item => item.trim());
    // cancel, delete, and update
    actions.forEach(action => {
        switch (action) {
            case 'Cancel Instance':
                cancelCodes.push(row.transaction_code);
                break;

            case 'Delete Instance':
                deleteCodes.push(row.transaction_code);
                break;

            case 'Create Instance':
                createCodes.push(row);
                break;

            case 'Create Series Instance':
                createSeriesCodes.push(row.Series);
                break;
        }
    });
};

const processFile = file => {
    const deleteCodes: string[] = [];
    const cancelCodes: string[] = [];
    const createCodes: string[] = [];
    const createSeriesCodes: string[] = [];
    const changes = {
        deleteCodes,
        cancelCodes,
        createCodes,
        createSeriesCodes
    };
    const stream = fs
        .createReadStream(file)
        .pipe(csv.parse({ headers: true }))
        .on('error', error => {
            console.error(error);
            process.exit(0);
        })
        .on('data', row => {
            getActions(row, changes);
        });

    finished(stream, async err => {
        if (err) {
            console.error('error finishing stream', err);
            return;
        }
        await makeChanges(changes);
    });
};

const handleOneTime = () => {
    processFile(oneTimeFile);
};

const handleSeries = () => {
    processFile(seriesFile);
};

export const contributionUpdates1962 = async () => {
    handleOneTime();
    handleSeries();
};
