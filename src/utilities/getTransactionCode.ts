import { TransactionType } from '../models';
import { EntityManager } from 'typeorm';

export const getTransactionCode = async (
    type: TransactionType | { name: string; abbreviation: string },
    manager: EntityManager
) => {
    const value = await manager.query(
        // TODO: create all sequence names in DB following this pattern <lowercase transaction type>TransactionCode ex: grantTransactionCode
        `SELECT nextval('${type.name.toLowerCase()}TransactionCode')`
    );
    return `${type.abbreviation}-${value[0].nextval.toString().padStart(4, 0)}`;
};

export const getTransactionCodeAbbreviation = (name: string) => {
    return name
        .split('_')
        .map(word => word.charAt(0))
        .join('');
};
