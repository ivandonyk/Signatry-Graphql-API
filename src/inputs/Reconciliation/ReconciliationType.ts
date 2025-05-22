import { registerEnumType } from 'type-graphql';

export enum ReconciliationType {
    INTERNAL = 'INTERNAL',
    IMA = 'IMA'
}

registerEnumType(ReconciliationType, { name: 'ReconciliationType' });
