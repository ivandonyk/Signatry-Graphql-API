import { Repository } from 'typeorm';
import { FundTransaction, TransactionType } from '../models';
import { ParseCsvResponse } from '../models/FeesResponse';
import { TransactionMetadata } from '../models/FundTransactionMetadata';
import { TransactionTypeValue } from '../models/TransactionType';
import { currency } from './currency';
import { FundRepository } from '../repositories/Fund';

export type fundTransactionDetailsFromCsv = {
    fundCode: string;
    amount: number;
    transactionDateTime: string | Date;
    metadata: TransactionMetadata;
    feeType: string;
};

export const createErrorBody = ({
    field,
    message
}: {
    field: string;
    message: string;
}): ParseCsvResponse => ({
    status: 'error',
    message: `Upload failed: ${message}`,
    field: field
});

export const getTransactionType = (val: string, transactionTypes: TransactionType[]) => {
    return transactionTypes.find(type => {
        switch (val) {
            case 'Administration':
                return type.name === TransactionTypeValue.ADMINISTRATION_FEE;

            case 'Investment':
                return type.name === TransactionTypeValue.INVESTMENT_FEE;
        }
    });
};

export const extractCsvData = (data: any[], headers: string[]): fundTransactionDetailsFromCsv => {
    // extract to json
    return data.reduce((acc: fundTransactionDetailsFromCsv, val: string, i: number) => {
        const field = headers[i];

        if (field === 'feeTransactionDate') {
            acc.transactionDateTime = val || new Date();
        } else if (field === 'feeAmount') {
            acc.amount = Number(val);
        } else if (field === 'feeDescription') {
            acc.metadata = { description: val };
        } else if (field === 'fundId') {
            acc.fundCode = val;
        } else {
            acc[field] = val;
        }

        return acc;
    }, {});
};

/** get array of fund.id for funds with negative balances  🤷‍♂️ */
export const fundsWithoutBalanceFromFundTransactions = async (
    transactions: FundTransaction[],
    fundRepo: FundRepository
): Promise<string[]> => {
    const summingObject = {} as any;

    for (const t of transactions) {
        if (summingObject.hasOwnProperty(t.fundId)) {
            summingObject[t.fundId] = currency.subtract(
                summingObject[t.fundId],
                Math.abs(t.amount)
            );
        } else {
            const fundBalance = await fundRepo.getInvestedBalanceByFundId(t.fundId);
            summingObject[t.fundId] = currency.subtract(fundBalance, Math.abs(t.amount));
        }
    }

    const fundsWithout = [] as string[];

    for (const key in summingObject) {
        if (summingObject[key] < 0) {
            fundsWithout.push(key);
        }
    }

    return fundsWithout;
};
