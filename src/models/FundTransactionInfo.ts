import { Field, ObjectType } from 'type-graphql';
import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    VersionColumn
} from 'typeorm';

import { FundTransaction } from './index';
import { Recipient } from './Recipient';

@Entity()
@ObjectType()
export class FundTransactionInfo {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Fund Transaction Id
    @OneToOne(
        type => FundTransaction,
        inverse => inverse.transactionInfo
    )
    @JoinColumn()
    @Field(type => FundTransaction, { nullable: false })
    fundTransaction: FundTransaction;
    @Column({ nullable: false })
    fundTransactionId: string;

    @ManyToOne(
        type => Recipient,
        inverse => inverse.fundDestinations
    )
    @Field(type => Recipient, { nullable: true })
    recipient: Recipient;
    @Column({ nullable: false })
    recipientId: string;

    // Purpose notes
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    purposeNotes: string;

    // Purpose category
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    purposeCategory: string;

    // Purpose notes approved (due diligence)
    @Column({
        type: 'boolean',
        nullable: true,
        enum: null,
        unique: false,
        default: () => false
    })
    @Field(type => Boolean, { nullable: true })
    purposeNotesApproved: boolean;

    // Special instructions
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    specialInstructions: string;

    // Special recognition
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    specialRecognition: string;

    // Fund Name Recognition
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    includeFundNameInRecognition: boolean;

    // Donor Names Recognition
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    includeDonorNameInRecognition: boolean;

    // Donor Address Recognition
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    includeDonorAddressInRecognition: boolean;

    // Special instructions approved (due diligence)
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => false
    })
    @Field(type => Boolean, { nullable: true })
    specialInstructionsApproved: boolean;

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

    // Requested Process Date
    @Column({
        type: 'timestamp',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Date, {
        nullable: true,
        deprecationReason: 'this is a duplicate of fundTransaction.scheduledDate'
    })
    requestedProcessDate: Date;

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
