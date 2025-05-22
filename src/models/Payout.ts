import { FundTransactionDetail } from './FundTransactionDetail';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    ManyToMany,
    JoinTable
} from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';

export enum PayoutStatusValue {
    PENDING = 'pending',
    PAID = 'paid',
    FAILED = 'failed',
    RECONCILED = 'reconciled'
}

@Entity()
@ObjectType()
export class Payout {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    payoutId: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    statementCode: string;

    @Column({
        type: 'character varying',
        enum: PayoutStatusValue,
        default: PayoutStatusValue.PENDING
    })
    @Field()
    status: PayoutStatusValue;

    @Column({
        type: 'float',
        nullable: false
    })
    @Field(type => Float, {
        nullable: true,
        defaultValue: 0
    })
    amount: number;

    @ManyToMany(type => FundTransactionDetail)
    @JoinTable({
        name: 'payout_fund_transaction_detail'
    })
    @Field(type => [FundTransactionDetail], { nullable: false })
    transactionDetails: FundTransactionDetail[];

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    @VersionColumn({ default: 1 })
    @Field()
    version: number;
}
