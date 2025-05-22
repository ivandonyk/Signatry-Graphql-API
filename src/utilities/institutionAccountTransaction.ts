import { getOrCreateConnection } from '../typeorm';
import {
    InstitutionAccountTransaction,
    InstitutionAccountTransactionResult,
    InstitutionAccountTransactionSummary
} from '../models';
import { InstitutionAccountTransactionType as TransactionType } from '../models/InstitutionAccountTransaction';
import { currency } from '../utilities/currency';

export const institutionAccountTransactionUtil = {
    getTransactionSummary(
        transactions: InstitutionAccountTransaction[]
    ): InstitutionAccountTransactionSummary {
        const sumsByType = {};
        sumsByType[TransactionType.DEPOSIT] = { valueSum: 0, unitSum: 0 };
        sumsByType[TransactionType.WITHDRAWAL] = { valueSum: 0, unitSum: 0 };
        sumsByType[TransactionType.BUY] = { valueSum: 0, unitSum: 0 };
        sumsByType[TransactionType.SELL] = { valueSum: 0, unitSum: 0 };
        sumsByType[TransactionType.FEE] = { valueSum: 0, unitSum: 0 };
        sumsByType[TransactionType.INTEREST] = { valueSum: 0, unitSum: 0 };
        sumsByType[TransactionType.DIVIDEND] = { valueSum: 0, unitSum: 0 };
        sumsByType[TransactionType.TRANSFER] = { valueSum: 0, unitSum: 0 };
        const depositTypes = [
            TransactionType.TRANSFER,
            TransactionType.DEPOSIT,
            TransactionType.DIRECT_DEPOSIT,
            TransactionType.CREDIT,
            TransactionType.CHECK
        ];
        const withdrawalTypes = [
            TransactionType.TRANSFER,
            TransactionType.CREDIT,
            TransactionType.DEBIT,
            TransactionType.WITHDRAWAL,
            TransactionType.PAYMENT,
            TransactionType.CHECK
        ];
        const stockTypes = [TransactionType.TRANSFER, TransactionType.BUY, TransactionType.SELL];
        const dividendTypes = [TransactionType.DIVIDEND, TransactionType.REINVESTMENT];
        const feeTypes = [TransactionType.FEE];
        const interestTypes = [TransactionType.INTEREST, TransactionType.INCOME];
        const sellTypes = [TransactionType.BUY, TransactionType.SELL, TransactionType.WITHDRAWAL];
        const buyTypes = [
            TransactionType.BUY,
            TransactionType.REINVESTMENT,
            TransactionType.DEPOSIT
        ];

        let realizedGain = 0;
        let totalUnits = 0;
        for (const t of transactions) {
            let transactionUnits = 0;
            if (t.isIgnored) {
                continue;
            }
            let sumType: TransactionType;
            if (t.amount === 0 && t.units && stockTypes.includes(t.transactionType)) {
                sumType = TransactionType.TRANSFER;
                totalUnits += t.units;
                transactionUnits = t.units;
            }
            if (t.amount > 0 && depositTypes.includes(t.transactionType)) {
                sumType = TransactionType.DEPOSIT;
            } else if (t.amount < 0 && withdrawalTypes.includes(t.transactionType)) {
                sumType = TransactionType.WITHDRAWAL;
            } else if (t.amount > 0 && dividendTypes.includes(t.transactionType)) {
                sumType = TransactionType.DIVIDEND;
            } else if (t.amount > 0 && interestTypes.includes(t.transactionType)) {
                sumType = TransactionType.INTEREST;
            } else if (t.amount < 0 && feeTypes.includes(t.transactionType)) {
                sumType = TransactionType.FEE;
            } else if (t.amount > 0 && sellTypes.includes(t.transactionType)) {
                sumType = TransactionType.SELL;
                realizedGain = currency.add(realizedGain, t.realizedGain);
                transactionUnits = t.units;
            } else if (t.amount < 0 && buyTypes.includes(t.transactionType)) {
                sumType = TransactionType.BUY;
                transactionUnits = t.units;
            }
            if (sumType) {
                sumsByType[sumType].valueSum = currency.add(
                    sumsByType[sumType].valueSum,
                    t.amount,
                    4
                );
                sumsByType[sumType].unitSum = currency.add(
                    sumsByType[sumType].unitSum,
                    transactionUnits,
                    4
                );
            }
        }

        return new InstitutionAccountTransactionSummary(sumsByType, realizedGain, totalUnits);
    }
};
