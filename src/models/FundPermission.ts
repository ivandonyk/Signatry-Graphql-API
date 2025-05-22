import { Entity, Column, ManyToMany, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { BaseEntity } from '../entities/BaseEntity';
import { FundRole } from './FundRole';

export enum FundPermissionAccessLevel {
    FULL = 'FULL',
    READ = 'READ',
    NONE = 'NONE'
}

export enum FundPermissionAccessType {
    DASHBOARD = 'DASHBOARD',
    ROLES_AND_PERMISSIONS = 'ROLES_AND_PERMISSIONS',
    LINK_DONOR_FUNDING_ACCOUNT = 'LINK_DONOR_FUNDING_ACCOUNT',
    INITIATE_CONTRIBUTION = 'INITIATE_CONTRIBUTION',
    CONTRIBUTION_SUMMARY = 'CONTRIBUTION_SUMMARY',
    CONTRIBUTION_DETAIL = 'CONTRIBUTION_DETAIL',
    EXPORT_CONTRIBUTION_TABLE = 'EXPORT_CONTRIBUTION_TABLE',
    FUND_TO_FUND_TRANSFERS = 'FUND_TO_FUND_TRANSFERS',
    INVESTMENT_INSTRUCTIONS = 'INVESTMENT_INSTRUCTIONS',
    DIVESTMENT_INSTRUCTIONS = 'DIVESTMENT_INSTRUCTIONS',
    REALLOCATE_INVESTMENTS = 'REALLOCATE_INVESTMENTS',
    REBALANCE_INVESTMENTS = 'REBALANCE_INVESTMENTS',
    TRANSACTION_DETAIL = 'TRANSACTION_DETAIL',
    DOCUMENT_SETTINGS = 'DOCUMENT_SETTINGS',
    RECOMMEND_A_GRANT = 'RECOMMEND_A_GRANT',
    VIEW_GRANTS_DASHBOARD = 'VIEW_GRANTS_DASHBOARD',
    GRANT_DETAIL = 'GRANT_DETAIL',
    EXPORT_GRANT_TABLE = 'EXPORT_GRANT_TABLE',
    GRANT_NOW_CTA = 'GRANT_NOW_CTA',
    GRANT_CANCEL = 'GRANT_CANCEL',
    REQUEST_IMA = 'REQUEST_IMA',
    INVESTMENT_SETTINGS = 'INVESTMENT_SETTINGS',
    FUND_NAME = 'FUND_NAME',
    FUND_DETAILS = 'FUND_DETAILS',
    FUND_PURPOSE = 'FUND_PURPOSE',
    LIQUIDATION_REQUESTS = 'LIQUIDATION_REQUESTS',
    CHARITY_SEARCH = 'CHARITY_SEARCH',
    FUND_CREATE = 'FUND_CREATE',
    CONTRIBUTION_CANCEL = 'CONTRIBUTION_CANCEL',
    SUCCESSION_PLAN = 'SUCCESSION_PLAN'
}

@Entity()
@ObjectType()
export class FundPermission extends BaseEntity {
    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    name: string;

    @Column({
        type: 'boolean',
        default: () => true
    })
    @Field(type => Boolean)
    enabled: boolean;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    description: string;

    @Column({
        type: 'enum',
        nullable: false,
        enum: FundPermissionAccessLevel
    })
    @Field(type => String, { nullable: false })
    accessLevel: FundPermissionAccessLevel;

    @Column({
        type: 'enum',
        nullable: false,
        enum: FundPermissionAccessType
    })
    @Field(type => String, { nullable: false })
    accessType: FundPermissionAccessType;

    @ManyToOne(
        type => FundRole,
        inverse => inverse.fundPermissions
    )
    @JoinColumn({ name: 'fund_role_id' })
    @Field(type => FundRole, { nullable: false })
    fundRole: FundRole;

    @Column({ nullable: false })
    fundRoleId: string;
}
