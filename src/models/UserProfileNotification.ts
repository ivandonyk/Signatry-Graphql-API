import {
    Entity,
    Column,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    CreateDateColumn,
    JoinColumn
} from 'typeorm';

import { ObjectType, Field } from 'type-graphql';
import { Notification } from './Notification';
import { UserProfile } from './UserProfile';
import { Fund } from './Fund';

@Entity()
@ObjectType()
export class UserProfileNotification {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

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
        inverse => inverse.userProfileNotifications
    )
    @Field(type => UserProfile, { nullable: false })
    userProfile: UserProfile;
    @Column({ nullable: false })
    userProfileId: string;

    @ManyToOne(
        type => Notification,
        inverse => inverse.userProfileNotifications
    )
    @Field(type => Notification, { nullable: false })
    notification: Notification;
    @Column({ nullable: false })
    notificationId: string;

    @ManyToOne(
        type => Fund,
        inverse => inverse.userProfileNotifications
    )
    @Field(type => Fund, { nullable: true })
    fund: Fund;
    @Column({ nullable: false })
    fundId: string;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;
}
