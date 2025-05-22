import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { ObjectType, Field } from 'type-graphql';
import { FundPermission } from './FundPermission';
import { FundUserProfile } from './FundUserProfile';

@Entity()
@ObjectType()
export class FundRelationship extends BaseEntity {
    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    name: string;

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
        inverse => inverse.fundRelationship
    )
    @Field(type => [FundUserProfile], { nullable: false })
    fundUserProfiles: FundUserProfile[];
}
