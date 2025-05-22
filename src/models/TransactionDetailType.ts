import { Entity, Column, OneToMany } from 'typeorm';
import { ObjectType, Field, registerEnumType } from 'type-graphql';

import { BaseEntity } from '../entities/BaseEntity';
import { FundTransactionDetail } from './FundTransactionDetail';

export enum TransactionDetailTypeName {
    CASH_IN = 'CASH_IN',
    GRANT_DIVESTMENT_CASH = 'GRANT_DIVESTMENT_CASH',
    CASH_OUT = 'CASH_OUT',
    FEE = 'FEE',
    PROCESSING_FEE = 'PROCESSING_FEE',
    ADVISOR_FEE = 'ADVISOR_FEE',
    BANK_FEE = 'BANK_FEE',
    INVESTMENT = 'INVESTMENT',
    DIVESTMENT = 'DIVESTMENT',
    INTEREST = 'INTEREST',
    TRANSFER = 'TRANSFER',
    DIVIDEND = 'DIVIDEND',
    TRANSFER_IN = 'TRANSFER_IN',
    TRANSFER_OUT = 'TRANSFER_OUT',
    STOCK_IN = 'STOCK_IN',
    BUY = 'BUY',
    SELL = 'SELL'
}

registerEnumType(TransactionDetailTypeName, {
    name: 'TransactionDetailTypeName',
    description: 'Enum for TransactionDetailType.name'
});

@Entity()
@ObjectType()
export class TransactionDetailType extends BaseEntity {
    @Column({
        enum: TransactionDetailTypeName,
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    name: TransactionDetailTypeName;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    description: string;

    @OneToMany(
        type => FundTransactionDetail,
        inverse => inverse.transactionDetailType
    )
    fundTransactionDetails: FundTransactionDetail[];
}
