import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany,
    ManyToOne
} from 'typeorm';

import { ObjectType, Field, Int, Float } from 'type-graphql';

import { Role } from '.';

export enum PermissionAccessType {
    USER_DEFAULTS = 'USER_DEFAULTS',
    ADMIN_FUNDS = 'ADMIN_FUNDS',
    ADMIN_IMA_MANAGEMENT = 'ADMIN_IMA_MANAGEMENT',
    ADMIN_INVESTMENT_POOLS = 'ADMIN_INVESTMENT_POOLS',
    ADMIN_CONTRIBUTIONS = 'ADMIN_CONTRIBUTIONS',
    ADMIN_BATCHES = 'ADMIN_BATCHES',
    ADMIN_RECIPIENTS = 'ADMIN_RECIPIENTS',
    ADMIN_GRANTS = 'ADMIN_GRANTS',
    ADMIN_GRANTS_NEW = 'ADMIN_GRANTS_NEW',
    ADMIN_GRANTS_DUE_DILIGENCE = 'ADMIN_GRANTS_DUE_DILIGENCE',
    ADMIN_GRANTS_REVIEW = 'ADMIN_GRANTS_REVIEW',
    ADMIN_GRANTS_PAYMENTS = 'ADMIN_GRANTS_PAYMENTS',
    ADMIN_GRANTS_ALL = 'ADMIN_GRANTS_ALL',
    ADMIN_GRANTS_SPECIAL_APPROVAL = 'ADMIN_GRANTS_SPECIAL_APPROVAL',
    ADMIN_GRANT_FINALIZE = 'ADMIN_GRANT_FINALIZE',
    ADMIN_USER_MANAGEMENT = 'ADMIN_USER_MANAGEMENT',
    ADMIN_INVESTMENTS = 'ADMIN_INVESTMENTS',
    ADMIN_DIVESTMENTS = 'ADMIN_DIVESTMENTS',
    ADMIN_BANK_ACCOUNTS = 'ADMIN_BANK_ACCOUNTS',
    ADMIN_RECONCILIATION = 'ADMIN_RECONCILIATION',
    ADMIN_CONTENT_MANAGEMENT = 'ADMIN_CONTENT_MANAGEMENT',
    ADMIN_FUND_TRANSFERS = 'ADMIN_FUND_TRANSFERS',
    ADMIN_TRANSACTIONS_ALL = 'ADMIN_TRANSACTIONS_ALL',
    // ADMIN_FUND_FEES = 'ADMIN_FUND_FEES',
    CHARITY_GRANT_NOW_CTA = 'CHARITY_GRANT_NOW_CTA',
    CHARITY_FAVORITES = 'CHARITY_FAVORITES',
    CHARITY_CREATE = 'CHARITY_CREATE',
    CHARITY_SEARCH = 'CHARITY_SEARCH',
    CHARITY_PROFILE = 'CHARITY_PROFILE',
    LINK_DONOR_FUNDING_ACCOUNT = 'LINK_DONOR_FUNDING_ACCOUNT',
    ADMIN_FEES = 'ADMIN_FEES'
}

export enum PermissionAccessLevel {
    NONE = 'NONE',
    READ = 'READ',
    FULL = 'FULL'
}

@Entity()
@ObjectType()
export class Permission {
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

    @Column({
        type: 'enum',
        nullable: false,
        enum: PermissionAccessLevel
    })
    @Field(type => String, { nullable: false })
    accessLevel: PermissionAccessLevel;

    @Column({
        type: 'enum',
        nullable: false,
        enum: PermissionAccessType
    })
    @Field(type => String, { nullable: false })
    accessType: PermissionAccessType;

    // Description
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    description: string;

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

    // Role
    @ManyToOne(type => Role, inverse => inverse.permissions)
    @Field(type => Role, { nullable: true })
    role: Role;
    @Column({ nullable: false })
    roleId: string;
}
