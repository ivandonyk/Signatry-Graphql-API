import { Field, ObjectType } from 'type-graphql';
import { Column, Entity, JoinColumn, ManyToMany, OneToOne } from 'typeorm';

import { BaseEntity } from '../entities/BaseEntity';
import { InstitutionAccount } from './InstitutionAccount';
import { UserProfile } from './UserProfile';

@Entity()
@ObjectType()
export class FinancialAdvisor extends BaseEntity {
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    fullName: string;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    addressLine1: string;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    addressLine2: string;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    city: string;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    state: string;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    postalCode: string;

    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    officeName: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    institutionName: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    phoneNumber: string;

    @Column({
        type: 'character varying',
        nullable: false
    })
    @Field(type => String, { nullable: false })
    email: string;

    @Column({ type: 'boolean', nullable: false, default: true })
    @Field(type => Boolean, { nullable: false })
    receivesInstructions: boolean;

    @OneToOne(
        type => UserProfile,
        inverse => inverse.financialAdvisor
    )
    @JoinColumn({ name: 'user_profile_id' })
    @Field(type => UserProfile, { nullable: true })
    userProfile: UserProfile;
    @Column({
        nullable: false
    })
    userProfileId: string;

    @ManyToMany(
        type => InstitutionAccount,
        inverse => inverse.financialAdvisors
    )
    @Field(type => [InstitutionAccount], { nullable: true })
    institutionAccounts: InstitutionAccount[];
}
