import { UserProfile } from './UserProfile';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    ManyToOne
} from 'typeorm';
import { ObjectType, Field, registerEnumType } from 'type-graphql';

export enum UserProfilePhoneType {
    WORK = 'Work',
    HOME = 'Home',
    MOBILE = 'Mobile'
}

registerEnumType(UserProfilePhoneType, {
    name: 'UserProfilePhoneType',
    description: 'User Profile Phone Number Type'
});

@Entity()
@ObjectType()
export class UserProfilePhone {
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
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    value: string;

    // Type
    @Column({
        type: 'character varying',
        nullable: true,
        enum: UserProfilePhoneType
    })
    @Field(type => String, { nullable: true })
    type: string;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Boolean, { nullable: false })
    isPrimary: boolean;

    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    @ManyToOne(
        type => UserProfile,
        inverse => inverse.phones
    )
    @Field(type => UserProfile, { nullable: false })
    userProfile: UserProfile;
    @Column({ nullable: false })
    userProfileId: string;
}
