import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { FundTransactionDetail } from '../models';

export function groupTransactionBatches(
    transactions: FundTransactionDetail[]
): {
    groupedContributionInvestments: { [investmentId: string]: FundTransactionDetail[] };
    groupedTransferInvestments: { [investmentId: string]: FundTransactionDetail[] };
    groupedDivestments: { [investmentId: string]: FundTransactionDetail[] };
} {
    const divestments = transactions.filter(transaction => {
        return transaction.transactionDetailType.name === TransactionDetailTypeName.DIVESTMENT;
    });

    const { transfer, contribution } = transactions
        .filter(transaction => {
            return transaction.transactionDetailType.name === TransactionDetailTypeName.INVESTMENT;
        })
        .reduce(
            (acc, transaction) => {
                // I'm not entirely confident all transactions have a parent transaction
                const { name = '' } = transaction.fundTransaction?.transactionType || {};
                if (name.includes('TRANSFER')) acc.transfer.push(transaction);
                else acc.contribution.push(transaction);

                return acc;
            },
            { transfer: [], contribution: [] }
        );

    // Reducer to group transactions by investment
    const byInvestmentReducer = (
        byInvestment: { [investmentId: string]: FundTransactionDetail[] },
        transaction: FundTransactionDetail
    ) => {
        const investmentId = transaction.fundInvestment.investmentId;
        if (!byInvestment.hasOwnProperty(investmentId)) {
            byInvestment[investmentId] = [];
        }
        byInvestment[investmentId].push(transaction);
        return byInvestment;
    };

    return {
        groupedContributionInvestments: contribution.reduce(byInvestmentReducer, {}),
        groupedTransferInvestments: transfer.reduce(byInvestmentReducer, {}),
        groupedDivestments: divestments.reduce(byInvestmentReducer, {})
    };
}

type GroupedTransactions = {
    sourceAccountId: string;
    destinationAccountId: string;
    transactions: FundTransactionDetail[];
};
export function groupBySourceAndDestinationAccounts(
    transactions: FundTransactionDetail[]
): GroupedTransactions[] {
    const findGroup = (
        sourceAccountId: string,
        destinationAccountId: string,
        groups: GroupedTransactions[]
    ): GroupedTransactions => {
        return groups.find(
            group =>
                group.sourceAccountId === sourceAccountId &&
                group.destinationAccountId === destinationAccountId
        );
    };
    return transactions.reduce((groups: GroupedTransactions[], t: FundTransactionDetail) => {
        let group = findGroup(t.sourceAccountId, t.destinationAccountId, groups);
        if (!group) {
            group = {
                sourceAccountId: t.sourceAccountId,
                destinationAccountId: t.destinationAccountId,
                transactions: []
            } as GroupedTransactions;
            groups.push(group);
        }
        if (!t.onHold) {
            group.transactions.push(t);
        }
        return groups;
    }, []);
}
