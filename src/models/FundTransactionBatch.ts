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
import { FundTransaction } from './FundTransaction';

export enum FundTransactionBatchTypeValue {
    INVESTMENT = 'INVESTMENT',
    DIVESTMENT = 'DIVESTMENT'
}

export enum FundTransactionBatchStatusValue {
    PENDING = 'PENDING',
    SUBMITTED = 'SUBMITTED',
    COMPLETE = 'COMPLETE'
}

@Entity()
@ObjectType()
export class FundTransactionBatch {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    @Column({ type: 'character varying' })
    createdBy: string;

    @Column({ type: 'character varying' })
    updatedBy: string;

    @Column({
        type: 'enum',
        enum: FundTransactionBatchTypeValue,
        default: FundTransactionBatchTypeValue.INVESTMENT
    })
    @Field(type => String, { nullable: true })
    type: FundTransactionBatchTypeValue;

    @Column({
        type: 'enum',
        enum: FundTransactionBatchStatusValue,
        default: FundTransactionBatchStatusValue.PENDING
    })
    @Field(type => String, { nullable: true })
    status: FundTransactionBatchStatusValue;

    @Column({ type: 'character varying' })
    @Field(type => String, { nullable: true })
    ledgerId: string;

    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    @OneToMany(
        type => FundTransaction,
        inverse => inverse.fundTransactionBatch
    )
    @Field(type => [FundTransaction], { nullable: false })
    fundTransactions: FundTransaction[];
}
