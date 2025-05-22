import { ObjectType, Field, registerEnumType } from 'type-graphql';
import {
    Entity,
    Column,
    JoinColumn,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany,
    OneToOne,
    ManyToMany,
    ManyToOne,
    JoinTable,
    AfterLoad,
    BeforeInsert
} from 'typeorm';

import { RecipientEvent } from './RecipientEvent';
import { AppUser } from './AppUser';
import { Role } from './Role';
import { UserProfileAccount } from './UserProfileAccount';
import { UserProfilePhone } from './UserProfilePhone';
import { UserProfileEmail } from './UserProfileEmail';
import { UserProfileAddress } from './UserProfileAddress';
import { FundUserProfile } from './FundUserProfile';
import { Fund } from './Fund';
import { TenantAccount } from './TenantAccount';
import { Investment } from './Investment';
import { TransactionEvent } from './TransactionEvent';
import { InvestmentUnitPriceHistory } from './InvestmentUnitPriceHistory';
import { FundTransaction } from './FundTransaction';
import { FinancialAdvisor } from './FinancialAdvisor';
import { UserProfileRole } from './UserProfileRole';
import { UserProfileNotification } from './UserProfileNotification';
import { Notification } from './Notification';
import { PositionType } from './PositionType';
import { getOrCreateConnection } from '../typeorm';
import { getUserCode } from '../utilities/getUserCode';

export enum PrimaryDeliveryMethods {
    MAIL = 'MAIL',
    PAPERLESS = 'PAPERLESS'
}

registerEnumType(PrimaryDeliveryMethods, {
    name: 'PrimaryDeliveryMethods'
});

export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

@Entity()
@ObjectType()
export class UserProfile {
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

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String)
    firstName: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    middleName: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String)
    lastName: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    prefix: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    suffix: string;

    @Column({
        type: 'enum',
        nullable: true,
        enum: PrimaryDeliveryMethods,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    primaryDeliveryMethod: PrimaryDeliveryMethods;

    @Field(type => String)
    fullName: string;

    @OneToOne(type => AppUser, inverse => inverse.userProfile)
    @JoinColumn({ name: 'app_user_id' })
    @Field(type => AppUser, { nullable: true })
    appUser: AppUser;
    @Column({ nullable: false })
    appUserId: string;

    @Field(type => String, { nullable: true })
    @Column({
        type: 'text',
        nullable: true
    })
    profilePicture: string;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => false
    })
    @Field(type => Boolean, { nullable: false })
    wasMigrated: boolean;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: true,
        default: () => undefined
    })
    @Field(type => String)
    accountingCustomerId: string;

    @OneToMany(type => UserProfileAccount, inverse => inverse.userProfile)
    @Field(type => [UserProfileAccount], { nullable: false })
    userProfileAccounts: UserProfileAccount[];

    @OneToMany(type => UserProfilePhone, inverse => inverse.userProfile)
    @Field(type => [UserProfilePhone], { nullable: true })
    phones: UserProfilePhone[];

    @OneToMany(type => UserProfilePhone, inverse => inverse.userProfile)
    @Field(type => UserProfilePhone, { nullable: true })
    primaryPhone: UserProfilePhone;

    @OneToMany(type => UserProfileEmail, inverse => inverse.userProfile)
    @Field(type => [UserProfileEmail], { nullable: true })
    emails: UserProfileEmail[];

    @OneToMany(type => UserProfileEmail, inverse => inverse.userProfile)
    @Field(type => UserProfileEmail, { nullable: true })
    primaryEmail: UserProfileEmail;

    @OneToMany(type => UserProfileAddress, inverse => inverse.userProfile)
    @Field(type => [UserProfileAddress], { nullable: true })
    addresses: UserProfileAddress[];

    @OneToMany(type => UserProfileAddress, inverse => inverse.userProfile)
    @Field(type => UserProfileAddress, { nullable: true })
    primaryAddress: UserProfileAddress;

    @OneToMany(type => FundUserProfile, inverse => inverse.userProfile)
    @Field(type => [FundUserProfile], { nullable: true })
    fundUserProfiles: FundUserProfile[];

    @ManyToMany(type => Fund)
    @JoinTable({ name: 'fund_user_profile' })
    @Field(type => [Fund], { nullable: true })
    funds: Fund[];

    @OneToMany(type => UserProfileNotification, inverse => inverse.userProfile)
    @Field(type => [UserProfileNotification], { nullable: false })
    userProfileNotifications: UserProfileNotification[];

    @ManyToMany(type => Notification)
    @JoinTable({ name: 'user_profile_notification' })
    @Field(type => [Notification], { nullable: true })
    notifications: Notification[];

    @OneToMany(type => Fund, inverse => inverse.createdByUserProfile)
    @Field(type => [Fund], { nullable: false })
    createdFunds: Fund[];

    @OneToMany(type => FundTransaction, inverse => inverse.userProfile)
    @Field(type => [FundTransaction], { nullable: true })
    fundTransactions: FundTransaction[];

    @OneToMany(type => FundTransaction, inverse => inverse.createdByAdmin)
    @Field(type => [Fund], { nullable: true })
    adminCreatedTransactions: FundTransaction[];

    @OneToMany(type => TenantAccount, inverse => inverse.createdBy)
    @Field(type => [TenantAccount], { nullable: false })
    createdTenantAccounts: TenantAccount[];

    @OneToMany(type => TenantAccount, inverse => inverse.updatedBy)
    @Field(type => [TenantAccount], { nullable: false })
    updatedTenantAccounts: TenantAccount[];

    @OneToMany(type => Investment, inverse => inverse.createdBy)
    @Field(type => [Investment], { nullable: false })
    createdInvestments: Investment[];

    @OneToMany(type => Investment, inverse => inverse.updatedBy)
    @Field(type => [Investment], { nullable: false })
    updatedInvestments: Investment[];

    @OneToMany(type => InvestmentUnitPriceHistory, inverse => inverse.createdBy)
    @Field(type => [InvestmentUnitPriceHistory], { nullable: false })
    createdInvestmentUnitPriceHistory: InvestmentUnitPriceHistory[];

    @OneToMany(type => InvestmentUnitPriceHistory, inverse => inverse.updatedBy)
    @Field(type => [InvestmentUnitPriceHistory], { nullable: false })
    updatedInvestmentUnitPriceHistory: InvestmentUnitPriceHistory[];

    @OneToMany(type => TransactionEvent, inverse => inverse.updatedBy)
    @Field(type => [TransactionEvent], { nullable: false })
    transactionEvents: TransactionEvent[];

    @OneToMany(type => RecipientEvent, inverse => inverse.updatedBy)
    @Field(type => [RecipientEvent], { nullable: false })
    recipientEvents: RecipientEvent[];

    @OneToOne(type => UserProfileRole, inverse => inverse.userProfile)
    @Field(type => UserProfileRole)
    userProfileRole: UserProfileRole;

    @ManyToMany(type => Role)
    @JoinTable({ name: 'user_profile_role' })
    @Field(type => Role, { nullable: true })
    role: Role;

    // Customer Id (Stripe)
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    customerId: string;

    // NOT IN USE
    @OneToOne(type => FinancialAdvisor, inverse => inverse.userProfile)
    @Field(type => FinancialAdvisor, { nullable: true })
    financialAdvisor: FinancialAdvisor;

    // Optional Financial Advisor fields
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    institution: string;

    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    officeName: string;

    @ManyToOne(type => PositionType, inverse => inverse.userProfiles)
    @Field(type => PositionType, { nullable: true })
    positionType: PositionType;
    @Column({ nullable: true })
    positionTypeId: string;

    @AfterLoad()
    setFullName() {
        this.fullName = [this.firstName, this.middleName, this.lastName]
            .filter(s => s && s.length)
            .join(' ');
    }

    // UserCode
    @Column({ type: 'character varying', nullable: false, unique: true })
    @Field(type => String, { nullable: false })
    userCode: string;

    @BeforeInsert()
    async setUserCode() {
        if (!this.userCode) {
            const connection = await getOrCreateConnection();

            this.userCode = await getUserCode(connection.manager);
        }
    }
}
