import { FundTransactionDetail } from '../models';
import { DetailPaymentType } from '../models/FundTransactionDetail';

export function groupTransactionsByRecipientPaymentType(
    transactionsByRecipientPaymentType: {
        [paymentType: string]: FundTransactionDetail[];
    },
    transaction: FundTransactionDetail
): {
    [paymentType: string]: FundTransactionDetail[];
} {
    const paymentType = transaction.fundTransaction.recipient[0].paymentType || 'Check';

    if (!transactionsByRecipientPaymentType.hasOwnProperty(paymentType)) {
        transactionsByRecipientPaymentType[paymentType] = [];
    }

    transactionsByRecipientPaymentType[paymentType] = [
        ...transactionsByRecipientPaymentType[paymentType],
        transaction
    ];

    return transactionsByRecipientPaymentType;
}

export function groupTransactionsByRecipientType(
    groupTransactionsByRecipientType: {
        [recipientid: string]: FundTransactionDetail[];
    },
    transaction: FundTransactionDetail
): {
    [recipientid: string]: FundTransactionDetail[];
} {
    const recipientId = transaction.fundTransaction.recipient[0].id;

    if (!groupTransactionsByRecipientType.hasOwnProperty(recipientId)) {
        groupTransactionsByRecipientType[recipientId] = [];
    }

    groupTransactionsByRecipientType[recipientId] = [
        ...groupTransactionsByRecipientType[recipientId],
        transaction
    ];

    return groupTransactionsByRecipientType;
}

export function groupTransactionsByMetadataPaymentType(
    transactions: FundTransactionDetail[]
): {
    [paymentType: string]: FundTransactionDetail[];
} {
    const transactionsByPaymentType = {
        ACH: [],
        CHECK: [],
        WIRE: []
    };
    for (const transaction of transactions) {
        const recipientPaymentType = transaction.fundTransaction.transactionInfo?.recipient?.paymentType?.toUpperCase();
        const metadataPaymentType =
            transaction.fundTransaction.metadata?.paymentDetails?.paymentType;

        const paymentType = metadataPaymentType || recipientPaymentType || DetailPaymentType.CHECK;

        transactionsByPaymentType[paymentType].push(transaction);
    }
    return transactionsByPaymentType;
}
