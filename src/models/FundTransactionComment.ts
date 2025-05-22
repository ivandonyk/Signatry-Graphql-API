import { ObjectType, Field } from 'type-graphql';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    ManyToOne,
    OneToOne
} from 'typeorm';
import { FundTransaction } from './FundTransaction';
import { TransactionStatus } from './TransactionStatus';
import { TransactionEvent } from './TransactionEvent';
import { UserProfile } from './UserProfile';

@Entity()
@ObjectType()
export class FundTransactionComment {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

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

    // Transaction Status Id
    @Column({ nullable: false })
    transactionStatusId: string;

    @ManyToOne(
        type => TransactionStatus,
        inverse => inverse.fundTransactionComments
    )
    @Field(type => TransactionStatus, { nullable: false })
    transactionStatus: TransactionStatus;

    // Fund Transaction Id
    @Column({ nullable: false })
    fundTransactionId: string;

    @ManyToOne(
        type => FundTransaction,
        inverse => inverse.fundTransactionComment
    )
    @Field(type => FundTransaction, { nullable: false })
    fundTransaction: FundTransaction;

    // Is a hold comment
    @Column({
        type: 'boolean'
    })
    @Field(type => Boolean)
    isHold: boolean;

    // Is a cancel comment
    @Column({
        type: 'boolean'
    })
    @Field(type => Boolean)
    isCancel: boolean;

    // Comment Author
    @Field(type => UserProfile, { nullable: false })
    author: UserProfile;

    // Comment content
    @Column({
        type: 'character varying'
    })
    @Field(type => String, { nullable: false })
    comment: string;
}
