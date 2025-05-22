import {
    Entity,
    Column,
    VersionColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    OneToOne,
    JoinColumn,
    UpdateDateColumn,
    CreateDateColumn
} from 'typeorm';

import { ObjectType, Field, Int, Float } from 'type-graphql';
import { Role } from './Role';
import { UserProfile } from './UserProfile';

export enum RoleTypeValues {
    ADMIN = 'Admin',
    STAFF = 'Staff',
    DONOR = 'Donor'
}

@Entity()
@ObjectType()
export class UserProfileRole {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

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

    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    @ManyToOne(
        type => Role,
        inverse => inverse.userProfileRoles
    )
    @Field(type => Role)
    role: Role;
    @Column({ nullable: false })
    // Role Type Id
    roleId: string;

    @OneToOne(
        type => UserProfile,
        inverse => inverse.userProfileRole
    )
    @JoinColumn({ name: 'user_profile_id' })
    @Field(type => UserProfile)
    userProfile: UserProfile;
    @Column({ nullable: false })
    // userProfile Id
    userProfileId: string;
}
