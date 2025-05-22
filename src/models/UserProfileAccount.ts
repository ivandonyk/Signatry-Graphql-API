import { PlaidAccount } from './PlaidAccount';
import { UserProfile } from './UserProfile';
import { UIStripeCard } from './UIFundingSource';
import { FundTransactionSource } from './FundTransactionSource';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany,
    ManyToOne,
    OneToOne,
    JoinColumn
} from 'typeorm';
import { ObjectType, Field, registerEnumType } from 'type-graphql';
import { TransactionRecurrence } from '.';

export enum UserProfileAccountTypes {
    BANK_ACCOUNT = 'BANK_ACCOUNT',
    CREDIT_CARD = 'CREDIT_CARD'
}

registerEnumType(UserProfileAccountTypes, {
    name: 'UserProfileAccountTypes',
    description: 'Account type (i.e., credit card, bank account)'
});

@Entity()
@ObjectType()
export class UserProfileAccount {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    // Is Primary
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Boolean, { nullable: false })
    isPrimary: boolean;

    // String when UserProfileAccount is a Plaid BANK_ACCOUNT; null when UserProfileAccount is a Stripe CREDIT_CARD
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    itemId: string;

    // String when UserProfileAccount is a Plaid BANK_ACCOUNT; null when UserProfileAccount is a Stripe CREDIT_CARD
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    accessToken: string | null;

    // String when UserProfileAccount is a Plaid BANK_ACCOUNT; null when UserProfileAccount is a Stripe CREDIT_CARD
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    institutionId: string;

    // String when UserProfileAccount is a Plaid BANK_ACCOUNT; null when UserProfileAccount is a Stripe CREDIT_CARD
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    accountId: string;

    // String when UserProfileAccount is a Stripe CREDIT_CARD; null when UserProfileAccount is a Plaid BANK_ACCOUNT
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    paymentMethodId: string;

    // User profile
    @ManyToOne(
        type => UserProfile,
        inverse => inverse.userProfileAccounts
    )
    userProfile: UserProfile;
    @Column({ nullable: true })
    userProfileId: string;

    // PlaidAccount object when UserProfileAccount is a Plaid BANK_ACCOUNT; null when UserProfileAccount is a Stripe CREDIT_CARD
    @Field(type => PlaidAccount, { nullable: true })
    account: PlaidAccount;

    // UIStripeCard object when UserProfileAccount is a Plaid CREDIT_CARD; null when UserProfileAccount is a Plaid BANK_ACCOUNT
    @Field(type => UIStripeCard, { nullable: true })
    card: UIStripeCard;

    // The type of UserProfileAccount this is (i.e., a bank account or credit card)
    @Column({
        enum: UserProfileAccountTypes,
        unique: false
    })
    @Field(type => UserProfileAccountTypes, { nullable: false })
    accountType: UserProfileAccountTypes;

    // Transaction sources
    @OneToMany(
        type => FundTransactionSource,
        inverse => inverse.userProfileAccount
    )
    @Field(type => [FundTransactionSource], { nullable: false })
    transactionSources: FundTransactionSource[];

    @OneToOne(
        type => TransactionRecurrence,
        inverse => inverse.userProfileAccount
    )
    @Field(type => TransactionRecurrence, { nullable: true })
    transactionRecurrence: TransactionRecurrence;

    // Created By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    createdBy: string;

    // Updated By
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    updatedBy: string;
}
