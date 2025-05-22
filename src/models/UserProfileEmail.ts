import { UserProfile } from './UserProfile';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany,
    ManyToOne,
    ManyToMany
} from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';

@Entity()
@ObjectType()
export class UserProfileEmail {
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
        inverse => inverse.emails
    )
    @Field(type => UserProfile, { nullable: false })
    userProfile: UserProfile;
    @Column({ nullable: false })
    userProfileId: string;
}
