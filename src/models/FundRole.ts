import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { ObjectType, Field } from 'type-graphql';
import { FundPermission } from './FundPermission';
import { FundUserProfile } from './FundUserProfile';

export enum FundRoleNameValues {
    _MASTER = '_MASTER',
    FULL_ACCESS = 'Full Access',
    READ_ONLY = 'Read Only',
    READ_ONLY_PLUS_INVESTMENTS = 'Read Only + Investments',
    INVESTMENT_MANAGER = 'Investment Manager',
    READ_ONLY_PLUS_GRANTS = 'Read Only + Grants',
    NO_ACCESS = 'No Access'
}

@Entity()
@ObjectType()
export class FundRole extends BaseEntity {
    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    name: FundRoleNameValues;

    @Column({
        nullable: false
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    @OneToMany(
        type => FundPermission,
        inverse => inverse.fundRole
    )
    @Field(type => [FundPermission], { nullable: true })
    fundPermissions: FundPermission[];

    @OneToMany(
        type => FundUserProfile,
        inverse => inverse.fundRole
    )
    @Field(type => [FundUserProfile], { nullable: false })
    fundUserProfiles: FundUserProfile[];
}
