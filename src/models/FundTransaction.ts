import { Field, Float, ObjectType } from 'type-graphql';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn
} from 'typeorm';

import { Fund } from './Fund';
import { FundTransactionBatch } from './FundTransactionBatch';
import { FundTransactionComment } from './FundTransactionComment';
import { FundTransactionDetail } from './FundTransactionDetail';
import { FundTransactionInfo } from './FundTransactionInfo';
import { TransactionMetadata, TransferMetadata } from './FundTransactionMetadata';
import { FundTransactionSource } from './FundTransactionSource';
import { Recipient } from './Recipient';
import { TransactionAllocation } from './TransactionAllocation';
import { TransactionDetailStatusValue } from './TransactionDetailStatus';
import { TransactionEvent } from './TransactionEvent';
import { TransactionRecurrence } from './TransactionRecurrence';
import { TransactionStatus } from './TransactionStatus';
import { TransactionType } from './TransactionType';
import { UserProfile } from './UserProfile';
import { UserProfileAccount } from './UserProfileAccount';

export enum RecurringGrantRepeatIntervals {
    // Enum key name = 'User-friendly name'
    EVERY_OTHER_WEEK = 'Every-Other-Week',
    MONTHLY = 'Monthly',
    EVERY_OTHER_MONTH = 'Every-Other-Month',
    QUARTERLY = 'Quarterly',
    SEMI_ANNUALLY = 'Semi-Annually',
    ANNUALLY = 'Annually'
}

export enum DisplayStatuses {
    SUBMITTED = 'SUBMITTED',
    PENDING = 'PENDING',
    PAID = 'PAID',
    COMPLETE = 'COMPLETE',
    CANCELED = 'CANCELED',
    RETURNED = 'RETURNED'
}

@Entity()
@ObjectType()
export class FundTransaction {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @ManyToOne(type => TransactionType, inverse => inverse.fundTransactions)
    @Field(type => TransactionType, { nullable: false })
    transactionType: TransactionType;
    @Column({ nullable: false })
    // Transaction Type Id
    transactionTypeId: string;

    // Transaction Date / TIme
    @Column({
        type: 'timestamp',
        nullable: true,
        enum: null,
        unique: false,
        default: () => null
    })
    @Field(type => Date, { nullable: true })
    transactionDateTime: Date;

    // Amount
    @Column({
        type: 'float',
        nullable: false,
        enum: null,
        unique: false,
        default: () => 0
    })
    @Field(type => Float, {
        nullable: true,
        defaultValue: 0
    })
    amount: number;

    // Transaction Status Id
    @ManyToOne(type => TransactionStatus, inverse => inverse.fundTransactions)
    @Field(type => TransactionStatus, { nullable: false })
    transactionStatus: TransactionStatus;
    @Column({ nullable: false })
    transactionStatusId: string;

    // fund transaction code
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: true,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    transactionCode: string;

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

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => false
    })
    @Field(type => Boolean)
    onHold: boolean;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => false
    })
    @Field(type => Boolean)
    bypassRequested: boolean;

    // @Column({
    //     type: 'date',
    //     nullable: true,
    //     enum: null,
    //     unique: false,
    //     default: () => null
    // })
    // @Field(type => Date, { nullable: true })
    // estimatedArrival: Date;

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

    @Field(type => UserProfile, { nullable: true })
    createdByProfile: UserProfile;

    @Column({
        type: 'character varying',
        nullable: true
    })
    createdByAdminId: string;

    // Created By Admin
    @ManyToOne(type => UserProfile, inverse => inverse.adminCreatedTransactions)
    @Field(type => UserProfile, { nullable: true })
    createdByAdmin: UserProfile;

    // Updated On
    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    // Transaction Date / TIme
    @Column({
        type: 'timestamp',
        nullable: true,
        enum: null,
        unique: false,
        default: () => null
    })
    // Contributed On
    @Field(type => Date, { nullable: true })
    chargedOn: Date;

    // Updated By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    updatedBy: string;

    // scheduledDate
    @Column({
        type: 'timestamp',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined,
        comment: 'this is a required field for all grants'
    })
    @Field(type => Date, { nullable: true })
    scheduledDate: Date;

    // paidOn
    @Column({
        type: 'timestamp',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Date, { nullable: true })
    paidOn: Date;

    // Version
    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    transactionPaymentId: string;

    // metadata
    @Column({
        type: 'json',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => TransferMetadata || TransactionMetadata, { nullable: true })
    metadata: TransferMetadata | TransactionMetadata;

    // Default investment allocations
    @Field(type => [TransactionAllocation], { nullable: true })
    investmentAllocations: TransactionAllocation[];

    // Default divestment allocations
    @Field(type => [TransactionAllocation], { nullable: true })
    divestmentAllocations: TransactionAllocation[];

    // User Profile (created by)
    @ManyToOne(type => UserProfile, inverse => inverse.fundTransactions)
    @Field(type => UserProfile, { nullable: true })
    userProfile: UserProfile;

    @Column({ nullable: true })
    userProfileId: string;

    // Fund
    @ManyToOne(type => Fund, inverse => inverse.transactions)
    @Field(type => Fund, { nullable: false })
    fund: Fund;
    @Column({ nullable: false })
    fundId: string;

    // Fund Transaction Batch
    @ManyToOne(type => FundTransactionBatch, inverse => inverse.fundTransactions)
    @Field(type => FundTransactionBatch, { nullable: false })
    fundTransactionBatch: FundTransactionBatch;
    @Column({ nullable: true })
    fundTransactionBatchId: string;

    // Fund Transaction Detail
    @OneToMany(type => FundTransactionDetail, inverse => inverse.fundTransaction)
    @Field(type => [FundTransactionDetail], { nullable: true })
    transactionDetails: FundTransactionDetail[];

    @ManyToOne(type => FundTransaction, inverse => inverse.recurringFundTransactions)
    @Field(type => FundTransaction, { nullable: true })
    originalFundTransaction: FundTransaction;
    @Column({ nullable: true })
    originalFundTransactionId: string;

    @OneToMany(type => FundTransaction, inverse => inverse.originalFundTransaction)
    @Field(type => FundTransaction, { nullable: true })
    recurringFundTransactions: FundTransaction[];

    // Fund Transaction Source
    @ManyToOne(type => FundTransactionSource, inverse => inverse.fundTransaction)
    @Field(type => FundTransactionSource, { nullable: true })
    fundTransactionSource: FundTransactionSource;
    @Column({ nullable: true })
    fundTransactionSourceId: string;

    // Fund Transaction Destination
    @OneToOne(type => FundTransactionInfo, inverse => inverse.fundTransaction)
    @Field(type => FundTransactionInfo, { nullable: true })
    transactionInfo: FundTransactionInfo;

    // Fund Recurrence Id
    @OneToOne(type => TransactionRecurrence, inverse => inverse.fundTransaction)
    @JoinColumn()
    @Field(type => TransactionRecurrence, { nullable: true })
    transactionRecurrence: TransactionRecurrence;
    @Column({ nullable: true })
    transactionRecurrenceId: string;

    @ManyToMany(type => Recipient)
    @JoinTable({ name: 'fund_transaction_info' })
    @Field(type => Recipient, { nullable: true })
    recipient: Recipient;

    // Fund transaction comments
    @OneToMany(type => FundTransactionComment, inverse => inverse.fundTransaction)
    @Field(type => [FundTransactionComment], { nullable: true })
    fundTransactionComment: FundTransactionComment[];

    // TransactionEvents
    @OneToMany(type => TransactionEvent, inverse => inverse.fundTransaction)
    @Field(type => [TransactionEvent], { nullable: true })
    transactionEvents: TransactionEvent[];

    // Transaction Fee
    @Field(type => FundTransaction, { nullable: true })
    feeTransaction: FundTransaction;

    @Column()
    @Field(type => Boolean)
    finalReview: boolean;

    @Column({ nullable: true })
    @Field(type => Boolean, { nullable: true })
    specialApproval: boolean;

    @Column({ nullable: true })
    @Field(type => String, { nullable: true })
    ledgerId: string;

    @Column({ nullable: false })
    @Field(type => Boolean, { nullable: false })
    availableBalanceApproved: boolean;

    @Field(type => String)
    holdReason: string;

    @Field(type => String)
    divestmentStatus: TransactionDetailStatusValue;

    @Field(type => String, { nullable: true })
    grantPaymentStatus: TransactionDetailStatusValue;

    @Field(type => String, { nullable: false })
    displayStatus: DisplayStatuses;

    @Field(type => String, { nullable: false })
    transferStatus: DisplayStatuses;

    @JoinColumn()
    @Field(type => UserProfileAccount, { nullable: true })
    userProfileAccount: UserProfileAccount;
    @Column({ nullable: true })
    userProfileAccountId: string;

    @Column({ nullable: false })
    @Field(type => Boolean, { nullable: false })
    isHistoric: boolean;

    @Column({
        type: 'timestamp',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Date, { nullable: true })
    historicImportedOn: Date;
}
