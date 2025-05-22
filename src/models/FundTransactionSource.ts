import { ObjectType, Field } from 'type-graphql';

import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToOne,
    ManyToOne
} from 'typeorm';
import { FundTransaction } from './FundTransaction';
import { UserProfileAccount } from './UserProfileAccount';

export enum FundTransactionSourceStatusValue {
    PENDING = 'PENDING',
    POSTED = 'POSTED',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
    RETURNED_BY_BANK = 'RETURNED_BY_BANK',
    FAILED = 'FAILED',
    CANCELED = 'CANCELED'
}

@Entity()
@ObjectType()
export class FundTransactionSource {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Fund Transaction Id
    @OneToOne(
        type => FundTransaction,
        inverse => inverse.fundTransactionSource
    )
    @Field(type => FundTransaction, { nullable: false })
    fundTransaction: FundTransaction;

    // Is Manual
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => false
    })
    @Field(type => Boolean, { nullable: false })
    isManual: boolean;

    // Stripe status
    @Column({
        type: 'enum',
        enum: FundTransactionSourceStatusValue,
        default: FundTransactionSourceStatusValue.PENDING
    })
    @Field(type => String, { nullable: true })
    status: FundTransactionSourceStatusValue;

    // Account Id (User Profile)
    @ManyToOne(
        type => UserProfileAccount,
        inverse => inverse.transactionSources
    )
    @Field(type => UserProfileAccount, { nullable: false })
    userProfileAccount: UserProfileAccount;
    @Column({ nullable: true })
    userProfileAccountId: string;

    // Customer Id (Stripe)
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    customerId: string;

    // Charge Id (Stripe)
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    chargeId: string;

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
}
