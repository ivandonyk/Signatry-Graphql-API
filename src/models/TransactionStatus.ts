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
import { FundTransactionComment } from './FundTransactionComment';
export interface GrantStatusType {
    oldStatus: string;
    grantId: string;
}
export enum TransactionStatusValue {
    SCHEDULED = 'SCHEDULED',
    NEW = 'NEW',
    PENDING = 'PENDING',
    SUBMITTED = 'SUBMITTED',
    READY_FOR_PAYOUT = 'READY_FOR_PAYOUT',
    PENDING_PAYOUT = 'PENDING_PAYOUT',
    PENDING_RECONCILIATION = 'PENDING_RECONCILIATION',
    READY_FOR_INVESTMENT = 'READY_FOR_INVESTMENT',
    INVESTED = 'INVESTED',
    CANCELED = 'CANCELED',
    DENIED = 'DENIED',
    IN_DUE_DILIGENCE = 'IN_DUE_DILIGENCE',
    IN_REVIEW = 'IN_REVIEW',
    COMPLETE = 'COMPLETE',
    PAYMENT_SCHEDULED = 'PAYMENT_SCHEDULED',
    APPROVED = 'APPROVED',
    PAID = 'PAID'
}

@Entity()
@ObjectType()
export class TransactionStatus {
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
    name: TransactionStatusValue;

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
        inverse => inverse.transactionStatus
    )
    @Field(type => [FundTransaction], { nullable: true })
    fundTransactions: FundTransaction[];

    // Fund Transaction Comments
    @OneToMany(
        type => FundTransaction,
        inverse => inverse.transactionStatus
    )
    @Field(type => [FundTransactionComment], { nullable: true })
    fundTransactionComments: FundTransactionComment[];
}
