import { FundInvestment } from './FundInvestment';
import { FundUserProfile } from './FundUserProfile';
import { FundTransaction } from './FundTransaction';
import { FundType } from './FundType';
import { UserProfile } from './UserProfile';
import { FundContact } from './FundContact';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany,
    OneToOne,
    ManyToOne,
    ManyToMany,
    JoinTable
} from 'typeorm';
import { ObjectType, Field, Float } from 'type-graphql';
import { PendingFundUser, TransactionRecurrence, UserProfileNotification } from '.';

// Fund codes for special, internal funds
// used only for accounting purposes
export enum InternalLedgerFundCodes {
    INTEREST = 'SUBLEDGER-INTEREST',
    FEES = 'SUBLEDGER-FEES'
}

@Entity()
@ObjectType()
export class Fund {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Name
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    name: string;

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

    // FundCode
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: true,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    fundCode: string;

    // FundKey
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: true,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    fundKey: string;

    // FundTypeId
    @ManyToOne(
        type => FundType,
        inverse => inverse.funds
    )
    @Field(type => FundType, { nullable: true })
    fundType: FundType;
    @Column({ nullable: false })
    fundTypeId: string;

    // StatementByMail
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Boolean, { nullable: false })
    statementByMail: boolean;

    // StatementByPaperless
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Boolean, { nullable: false })
    statementByPaperless: boolean;

    // Invested balance
    @Column({
        type: 'float',
        default: () => 0
    })
    @Field(type => Float, {
        defaultValue: 0
    })
    investedBalance: number;

    // Invested balance for one time use
    @Field(type => Float, {
        defaultValue: 0,
        description:
            'This field is extremely intensive and will crash our server if called in a loop'
    })
    investedBalanceForOneTimeUse: number;

    // Cash balance
    @Column({
        type: 'float',
        default: () => 0
    })
    @Field(type => Float, {
        defaultValue: 0
    })
    cashBalance: number;

    @Field(type => Float, { defaultValue: 0 })
    currentBalance: number;

    @Field(type => Float, { defaultValue: 0 })
    availableBalance: number;

    @Field(type => Float, { defaultValue: 0 })
    pendingBalance: number;

    @Field(type => Float, { defaultValue: 0 })
    totalBalance: number;

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

    @Field(type => String, { nullable: true })
    @Column({
        type: 'text',
        nullable: true
    })
    fundPhoto: string;

    // Accounting project
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: true,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    accountingProjectId: string;

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
    @Field()
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

    // user profile id of the primary account holder
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => null
    })
    @Field(type => String, { nullable: false })
    primaryAccountHolderId: string;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => null
    })
    @Field(type => Boolean, { nullable: false })
    recurringContributionsDismissed: boolean;

    @Field(type => Boolean, { nullable: true })
    @Column({
        type: 'boolean',
        nullable: true,
        default: false
    })
    isLocked: boolean;

    @Field(type => Boolean, { nullable: false })
    @Column({
        type: 'boolean',
        nullable: false,
        default: true
    })
    divestmentFallback: boolean;

    @OneToMany(
        type => FundInvestment,
        inverse => inverse.fund
    )
    @Field(type => [FundInvestment], { nullable: false })
    investments: FundInvestment[];

    @OneToMany(
        type => FundTransaction,
        inverse => inverse.fund
    )
    @Field(type => [FundTransaction], { nullable: false })
    transactions: FundTransaction[];

    @OneToMany(
        type => TransactionRecurrence,
        inverse => inverse.fund
    )
    @Field(type => [TransactionRecurrence], { nullable: false })
    recurrences: TransactionRecurrence[];

    @OneToOne(
        type => FundContact,
        inverse => inverse.fund
    )
    @Field(type => FundContact, {
        nullable: true,
        description: "POOL_SUBLEDGER types don't have contacts"
    })
    contact: FundContact;

    @Field(type => UserProfile, { nullable: false })
    primaryAccountHolder: UserProfile;

    @OneToMany(
        type => FundContact,
        inverse => inverse.fund
    )
    @Field(type => [FundContact], { nullable: true })
    contacts: FundContact[];

    @OneToMany(
        type => PendingFundUser,
        inverse => inverse.fund
    )
    @Field(type => [PendingFundUser], { nullable: true })
    pendingFundUsers: PendingFundUser[];

    @OneToMany(
        type => FundUserProfile,
        inverse => inverse.fund
    )
    @Field(type => [FundUserProfile], { nullable: false })
    fundUserProfiles: FundUserProfile[];

    @ManyToMany(type => UserProfile)
    @JoinTable({ name: 'fund_user_profile' })
    @Field(type => [UserProfile], { nullable: true })
    userProfiles: UserProfile[];

    @ManyToOne(
        type => UserProfile,
        inverse => inverse.createdFunds
    )
    @Field(type => UserProfile, { nullable: false })
    createdByUserProfile: UserProfile;
    @Column({ nullable: false })
    createdByUserProfileId: string;

    @OneToMany(
        type => UserProfileNotification,
        inverse => inverse.fund
    )
    @Field(type => [UserProfileNotification], { nullable: true })
    userProfileNotifications: UserProfileNotification[];

    // Used in field resolver calculations to prevent duplicate calcs.
    sharedStockBalance: number;
    pendingIncoming: number;
    pendingOutgoing: number;
    pendingIncomingForAvailable: number;
    pendingOutgoingForAvailable: number;
    calculatedInvestedBalance: number;
    calculatedCashBalance: number;
}
