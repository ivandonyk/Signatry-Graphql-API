import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    ManyToOne,
    OneToOne,
    JoinColumn
} from 'typeorm';
import { ObjectType, Field } from 'type-graphql';

import { Fund } from './Fund';
import { FundTransaction } from './FundTransaction';
import { Recipient } from './Recipient';
import { TransactionType } from './TransactionType';
import { UserProfileAccount } from '.';
import { TransactionReference } from './TransactionReference';

@Entity()
@ObjectType()
export class TransactionRecurrence {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

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

    @Column({
        type: 'json',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => TransactionReference, { nullable: true })
    transactionRef: TransactionReference;

    // Created By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field()
    recurrenceRule: string;

    @Field(type => String)
    recurrenceRuleReadable: string;

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

    // Fund Transaction
    @OneToOne(
        type => FundTransaction,
        inverse => inverse.transactionRecurrence
    )
    @Field(type => FundTransaction, { nullable: false })
    fundTransaction: FundTransaction;

    // Recipient Id
    @OneToOne(
        type => UserProfileAccount,
        inverse => inverse.transactionRecurrence
    )
    @JoinColumn()
    @Field(type => UserProfileAccount, { nullable: true })
    userProfileAccount: UserProfileAccount;
    @Column({ nullable: true })
    userProfileAccountId: string;

    // Recipient Id
    @OneToOne(
        type => Recipient,
        inverse => inverse.transactionRecurrence
    )
    @JoinColumn()
    @Field(type => Recipient, { nullable: true })
    recipient: Recipient;
    @Column({ nullable: true })
    recipientId: string;

    // Fund
    @ManyToOne(
        type => Fund,
        inverse => inverse.recurrences
    )
    @Field(type => Fund, { nullable: false })
    fund: Fund;
    @Column({ nullable: false })
    fundId: string;

    // Transaction Type
    @ManyToOne(
        type => TransactionType,
        inverse => inverse.transactionRecurrences
    )
    @Field(type => TransactionType, { nullable: false })
    transactionType: TransactionType;
    @Column({ nullable: false })
    // Transaction Type Id
    transactionTypeId: string;

    // Recipient Name
    @Field(type => String, { nullable: true })
    @Column({ nullable: true })
    recipientName?: string;

    // Recipient Notes
    @Field(type => String, { nullable: true })
    @Column({ nullable: true })
    recipientNotes?: string;
}
