import { FundTransaction } from './FundTransaction';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany
} from 'typeorm';
import { ObjectType, Field } from 'type-graphql';
import { TransactionRecurrence } from '.';

export enum TransactionTypeValue {
    GRANT = 'GRANT',
    GRANT_SERIES = 'GRANT_SERIES',
    CONTRIBUTION = 'CONTRIBUTION',
    CONTRIBUTION_SERIES = 'CONTRIBUTION_SERIES',
    FEE = 'FEE',
    PROCESSING_FEE = 'PROCESSING_FEE',
    ADVISOR_FEE = 'ADVISOR_FEE',
    BANK_FEE = 'BANK_FEE',
    INTEREST = 'INTEREST',
    DIVIDEND = 'DIVIDEND',
    TRANSFER_OUT = 'TRANSFER_OUT',
    TRANSFER_IN = 'TRANSFER_IN',
    INTERNAL_TRANSFER = 'INTERNAL_TRANSFER',
    BUY = 'BUY',
    SELL = 'SELL',
    INVESTMENT_FEE = 'INVESTMENT_FEE',
    ADMINISTRATION_FEE = 'ADMINISTRATION_FEE',
    REBALANCE = 'REBALANCE'
}

@Entity()
@ObjectType()
export class TransactionType {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Name (Transaction Name)
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    name: TransactionTypeValue;

    // abbreviation
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    abbreviation: string;

    // Description
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    description: string;

    // Enabled
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    // Created On
    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    // Created By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    createdBy: string;

    // Updated On
    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    // Updated By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    updatedBy: string;

    // Version
    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    // Fund Transactions
    @OneToMany(
        type => FundTransaction,
        inverse => inverse.transactionType
    )
    @Field(type => [FundTransaction], { nullable: true })
    fundTransactions: FundTransaction[];

    // Fund Transactions
    @OneToMany(
        type => TransactionRecurrence,
        inverse => inverse.transactionType
    )
    @Field(type => [TransactionRecurrence], { nullable: true })
    transactionRecurrences: TransactionRecurrence[];
}
