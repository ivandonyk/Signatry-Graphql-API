import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany
} from 'typeorm';

import { ObjectType, Field, Int, Float } from 'type-graphql';
import { UserProfileRole } from './UserProfileRole';
import { Invitation } from './Invitation';
import { Permission } from './Permission';

export enum RoleTypeValues {
    _MASTER = '_MASTER',
    DONOR = 'Donor',
    STAFF_BASIC = 'STAFF_BASIC',
    STAFF_PLUS = 'STAFF_PLUS',
    STAFF_FINANCE = 'STAFF_FINANCE',
    STAFF_FINANCE_EXECUTIVE = 'STAFF_FINANCE_EXECUTIVE',
    STAFF_ADMIN = 'STAFF_ADMIN',
    GLOBAL_ADMIN = 'GLOBAL_ADMIN',
    CHARITY = 'CHARITY'
}

@Entity()
@ObjectType()
export class Role {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Name
    @Column({
        type: 'character varying',
        nullable: false,
        enum: RoleTypeValues,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    name: string;

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

    @OneToMany(
        type => UserProfileRole,
        inverse => inverse.role
    )
    @Field(type => [UserProfileRole], { nullable: true })
    userProfileRoles: UserProfileRole[];

    @OneToMany(
        type => Permission,
        inverse => inverse.role
    )
    @Field(type => [Permission])
    permissions: Permission[];

    @OneToMany(
        type => Invitation,
        inverse => inverse.role
    )
    @Field(type => [Invitation], { nullable: true })
    invitations: Invitation[];
}
