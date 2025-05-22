import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    ManyToOne,
    JoinColumn,
    BeforeInsert
} from 'typeorm';
import { ObjectType, Field, Float, registerEnumType } from 'type-graphql';
import { FundTransaction } from './FundTransaction';
import { FundInvestment } from './FundInvestment';
import { TransactionDetailStatus } from './TransactionDetailStatus';
import { TransactionDetailType } from './TransactionDetailType';
import { Batch } from './Batch';
import { GLAccount } from './GLAccount';
import {
    getTransactionCode,
    getTransactionCodeAbbreviation
} from '../utilities/getTransactionCode';
import { getOrCreateConnection } from '../typeorm';

// also used in FundTransaction.metadata.paymentDetails
export enum DetailPaymentType {
    CASH = 'CASH',
    CHECK = 'CHECK',
    ACH = 'ACH',
    WIRE = 'WIRE',
    SECURITY = 'SECURITY',
    CREDIT = 'CREDIT',
    _SYSTEM_GENERATED = '_SYSTEM_GENERATED'
}

registerEnumType(DetailPaymentType, {
    name: 'DetailPaymentType',
    description:
        '"paymentType" for both FundTransactionDetail and FundTransaction.metadata.paymentDetails'
});

@Entity()
@ObjectType()
export class FundTransactionDetail {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Description
    @Column({
        type: 'timestamp',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    description: string;

    // Fund Transaction Id
    @ManyToOne(
        type => FundTransaction,
        inverse => inverse.transactionDetails
    )
    @Field(type => FundTransaction, { nullable: false })
    fundTransaction: FundTransaction;
    @Column({ nullable: false })
    fundTransactionId: string;

    // Fund Investment
    @ManyToOne(
        type => FundInvestment,
        inverse => inverse.transactionDetails
    )
    @Field(type => FundInvestment, { nullable: true })
    fundInvestment: FundInvestment;
    @Column({ nullable: true })
    @Field(type => String, { nullable: true })
    fundInvestmentId: string;

    // Transaction Date / Time
    @Column({
        type: 'timestamp',
        nullable: true
    })
    @Field()
    transactionDateTime: Date;

    // Resolved Date / Time
    @Column({
        type: 'timestamp',
        nullable: true
    })
    @Field()
    resolvedDateTime: Date;

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

    // Payment Type
    @Column({
        nullable: false,
        type: 'character varying',
        enum: DetailPaymentType
    })
    @Field(type => String, { nullable: false })
    paymentType: DetailPaymentType;

    // Units
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
    units: number;

    // Transaction Detail Status Id
    @ManyToOne(
        type => TransactionDetailStatus,
        inverse => inverse.fundTransactionDetails
    )
    @Field(type => TransactionDetailStatus, { nullable: false })
    transactionDetailStatus: TransactionDetailStatus;
    @Column({ nullable: false })
    transactionDetailStatusId: string;

    @ManyToOne(type => TransactionDetailType)
    @JoinColumn({ name: 'transaction_detail_type_id' })
    @Field(type => TransactionDetailType, { nullable: false })
    transactionDetailType: TransactionDetailType;
    @Column({ nullable: false })
    transactionDetailTypeId: string;

    @ManyToOne(type => Batch)
    @JoinColumn({ name: 'batch_id' })
    @Field(type => Batch, { nullable: true })
    batch: Batch;
    @Column({ nullable: true })
    batchId: string;

    @Column({ nullable: true })
    @Field(type => String, { nullable: true })
    ledgerId: string;

    // source account
    @ManyToOne(type => GLAccount)
    @JoinColumn({ name: 'source_glaccount_id' })
    @Field(type => GLAccount, { nullable: true })
    sourceAccount: GLAccount;
    @Column({ name: 'source_glaccount_id', nullable: true })
    @Field(type => String, { nullable: true })
    sourceAccountId: string;

    // destination account
    @ManyToOne(type => GLAccount)
    @JoinColumn({ name: 'destination_glaccount_id' })
    @Field(type => GLAccount, { nullable: true })
    destinationAccount: GLAccount;
    @Column({ name: 'destination_glaccount_id', nullable: true })
    @Field(type => String, { nullable: true })
    destinationAccountId: string;

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
    @Field(type => Boolean, { nullable: false })
    onHold: boolean;

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

    // Transaction Code and listener
    @Column({ unique: true, type: 'character varying' })
    @Field()
    transactionCode: string;

    @BeforeInsert()
    async setTransactionCode() {
        const connection = await getOrCreateConnection();

        // generate transaction code
        const transactionDetailType = await connection
            .getRepository(TransactionDetailType)
            .findOne({ id: this.transactionDetailTypeId });

        const transactionType = {
            name: 'fund',
            abbreviation: getTransactionCodeAbbreviation(transactionDetailType.name)
        };

        // update record
        this.transactionCode = await getTransactionCode(transactionType, connection.manager);
    }
}
