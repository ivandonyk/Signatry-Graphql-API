import { registerEnumType } from 'type-graphql';

export enum ReconciliationStatus {
    UNRECONCILED = 'UNRECONCILED',
    RECONCILED = 'RECONCILED'
}

registerEnumType(ReconciliationStatus, { name: 'ReconciliationStatus' });
