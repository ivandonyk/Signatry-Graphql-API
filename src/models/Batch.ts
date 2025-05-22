import {
    Entity,
    Column,
    OneToMany,
    ManyToOne,
    JoinColumn,
    BeforeInsert,
    BeforeUpdate
} from 'typeorm';
import { ObjectType, Field, Float, registerEnumType } from 'type-graphql';

import { BaseEntity } from '../entities/BaseEntity';
import { GLAccount, FundTransactionDetail, UserProfile } from '../models';
import { BatchComment } from './BatchComment';
import { InstitutionAccountTransaction } from './InstitutionAccountTransaction';
import { BatchMetadata } from './batch/metadata';
import { BatchCancelMetadata } from './batch/cancelMetadata';

export enum BatchStatusValue {
    PENDING = 'PENDING',
    PARTIAL = 'PARTIAL',
    POSTED = 'POSTED',
    CANCELED = 'CANCELED'
}

registerEnumType(BatchStatusValue, {
    name: 'BatchStatusValue',
    description: 'possible values for batch.status'
});

export enum BatchPaymentTypeValue {
    ACH = 'ACH',
    CHECK = 'CHECK',
    DEPOSIT = 'DEPOSIT',
    FEE = 'FEE',
    INTEREST = 'INTEREST',
    WIRE = 'WIRE',
    WITHDRAWAL = 'WITHDRAWAL',
    DIVIDEND = 'DIVIDEND',
    SELL = 'SELL',
    BUY = 'BUY',
    REINVESTMENT = 'REINVESTMENT',
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT',
    OTHER = 'OTHER',
    TRANSFER = 'TRANSFER',
    INCOME = 'INCOME'
}

@Entity()
@ObjectType()
export class Batch extends BaseEntity {
    @Column({
        type: 'float',
        nullable: false
    })
    @Field(type => Float, { nullable: false })
    amount: number;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    description: string;

    @Column({
        nullable: true
    })
    @Field(type => Date, { nullable: true })
    postedOn: Date;

    @Column({
        nullable: true
    })
    @Field(type => Date, { nullable: true })
    clearedOn: Date;

    @Column({
        nullable: true
    })
    @Field(type => Date, { nullable: true })
    reconciledOn: Date; // Not actually used or set anywhere

    @Column({ nullable: true })
    @Field(type => Date, { nullable: true })
    canceledOn: Date;

    @Column({ enum: BatchPaymentTypeValue })
    @Field(type => String, { nullable: false })
    paymentType: BatchPaymentTypeValue;

    @Column({ enum: BatchStatusValue })
    @Field(type => String, { nullable: false })
    status: BatchStatusValue;

    @ManyToOne(type => GLAccount)
    @JoinColumn({ name: 'source_glaccount_id' })
    @Field(type => GLAccount, { nullable: true })
    sourceGLAccount: GLAccount;
    @Column({ name: 'source_glaccount_id', nullable: true })
    @Field(type => String, { nullable: true })
    sourceGLAccountId: string;

    @ManyToOne(type => GLAccount)
    @JoinColumn({ name: 'destination_glaccount_id' })
    @Field(type => GLAccount, { nullable: true })
    destinationGLAccount: GLAccount;
    @Column({ name: 'destination_glaccount_id', nullable: true })
    @Field(type => String, { nullable: true })
    destinationGLAccountId: string;

    @OneToMany(
        type => FundTransactionDetail,
        inverse => inverse.batch
    )
    @Field(type => [FundTransactionDetail], { nullable: false })
    transactions: FundTransactionDetail[];

    @OneToMany(
        type => BatchComment,
        inverse => inverse.batch
    )
    @Field(type => [BatchComment], { nullable: false })
    comments: BatchComment[];

    @Column({
        type: 'json',
        nullable: true
    })
    @Field(type => BatchMetadata, { nullable: true })
    sourceInfo: BatchMetadata;

    @Column({
        type: 'json',
        nullable: true
    })
    @Field(type => BatchMetadata, { nullable: true })
    destinationInfo: BatchMetadata;

    @Column({ type: 'character varying', nullable: false })
    @Field(type => String, { nullable: false })
    batchCode: string;

    @Column({ type: 'jsonb', nullable: true })
    @Field(type => [BatchCancelMetadata], { nullable: true })
    cancelMetadata: BatchCancelMetadata[];

    @BeforeUpdate()
    @BeforeInsert()
    setStatus() {
        if (this.status === BatchStatusValue.CANCELED) return;

        const { sourceInfo, destinationInfo } = this;
        let newStatus = '' as BatchStatusValue;

        if (
            (sourceInfo?.notRequired || sourceInfo?.posted) &&
            (destinationInfo?.notRequired || destinationInfo?.posted)
        ) {
            newStatus = BatchStatusValue.POSTED;
            this.postedOn = new Date();
        } else if (
            (sourceInfo?.notRequired === false && sourceInfo?.posted) ||
            (destinationInfo?.notRequired === false && destinationInfo?.posted)
        ) {
            newStatus = BatchStatusValue.PARTIAL;
        } else {
            newStatus = BatchStatusValue.PENDING;
        }

        if (newStatus !== this.status) {
            this.status = newStatus;
        }
    }

    private updatePostedInfo(metadata: BatchMetadata, user: UserProfile) {
        metadata.posted = true;
        metadata.postedBy = user.id;
        metadata.postedOn = new Date().toISOString();
    }

    matchWith(transaction: InstitutionAccountTransaction, user: UserProfile) {
        this.clearedOn = transaction.postedOn;
        // set posted date
        const reconciliationGlAccountId = transaction.institutionAccount.glAccountId;

        if (this.sourceGLAccountId === reconciliationGlAccountId) {
            this.updatePostedInfo(this.sourceInfo, user);
        }
        if (this.destinationGLAccountId === reconciliationGlAccountId) {
            this.updatePostedInfo(this.destinationInfo, user);
        }
    }
}
