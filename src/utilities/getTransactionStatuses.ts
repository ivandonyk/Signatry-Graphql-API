import { EntityManager } from 'typeorm';
import { TransactionStatus, TransactionStatusValue } from '../models/TransactionStatus';
import {
    TransactionDetailStatus,
    TransactionDetailStatusValue
} from '../models/TransactionDetailStatus';

export type TransactionStatusMap = {
    [key in TransactionStatusValue]: string;
};

export type TransactionDetailStatusMap = {
    [key in TransactionDetailStatusValue]: string;
};

/**
 * Get a map of transaction statuses - { id: name, ... }
 * @param manager
 */
export async function getTransactionStatuses(
    manager: EntityManager
): Promise<TransactionStatusMap> {
    // index transaction status IDs by name
    return (await manager.getRepository(TransactionStatus).find()).reduce((acc, status) => {
        acc[status.name] = status.id;
        return acc;
    }, {} as TransactionStatusMap);
}

/**
 * Get a map of transaction detail statuses - { id: name, ... }
 * @param manager
 */
export async function getTransactionDetailStatuses(
    manager: EntityManager
): Promise<TransactionDetailStatusMap> {
    // index transaction status IDs by name
    return (await manager.getRepository(TransactionDetailStatus).find()).reduce((acc, status) => {
        acc[status.name] = status.id;
        return acc;
    }, {} as TransactionDetailStatusMap);
}

/**
 * Format a status value (PENDING -> Pending, READY_FOR_INVESTMENT -> Ready for Investment)
 * @param status
 */
export function formatStatus(status = '') {
    return status
        .split('_')
        .map(word => {
            // lowercase for intermediate words like 'for'
            if (/^FOR$|^AS$|^THE$/.test(word)) return word.toLowerCase();
            // lowercase all but first letter for other words
            return word.replace(/\B[A-Z]+/, s => s.toLowerCase());
        })
        .join(' ');
}
