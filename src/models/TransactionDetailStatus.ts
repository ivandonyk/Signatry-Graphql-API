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
import { FundTransactionDetail } from './FundTransactionDetail';

export enum TransactionDetailStatusValue {
    PENDING = 'PENDING',
    READY_FOR_PAYOUT = 'READY_FOR_PAYOUT',
    PENDING_PAYOUT = 'PENDING_PAYOUT',
    PENDING_RECONCILIATION = 'PENDING_RECONCILIATION',
    READY_FOR_INVESTMENT = 'READY_FOR_INVESTMENT',
    READY_FOR_DIVESTMENT = 'READY_FOR_DIVESTMENT',
    INVESTED = 'INVESTED',
    READY_FOR_PAYMENT = 'READY_FOR_PAYMENT',
    PROCESSED = 'PROCESSED',
    CANCELED = 'CANCELED',
    DENIED = 'DENIED',
    DIVESTED = 'DIVESTED',
    COMPLETE = 'COMPLETE',
    SUBMITTED = 'SUBMITTED',
    SCHEDULED = 'SCHEDULED'
}

@Entity()
@ObjectType()
export class TransactionDetailStatus {
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
    name: TransactionDetailStatusValue;

    // Description
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
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

    // Fund Transaction Detail
    @OneToMany(
        type => FundTransactionDetail,
        inverse => inverse.transactionDetailStatus
    )
    @Field(type => [FundTransactionDetail], { nullable: true })
    fundTransactionDetails: FundTransactionDetail[];
}
