import {
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Entity
} from 'typeorm';

import { Field, ObjectType } from 'type-graphql';
import { OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { UserProfileNotification } from './UserProfileNotification';
import { UserProfile } from './UserProfile';

export enum NotificationType {
    FUND_CREATED = 'FUND_CREATED',
    FUND_EDITED = 'FUND_EDITED',
    FUND_DELETED = 'FUND_DELETED',
    FUND_ROLE_ADDED_REMOVED = 'FUND_ROLE_ADDED_REMOVED',
    FUND_SUCCESSOR_ADDED_REMOVED = 'FUND_SUCCESSOR_ADDED_REMOVED',
    CONTRIBUTION_CREATED = 'CONTRIBUTION_CREATED',
    CONTRIBUTION_POSTED = 'CONTRIBUTION_POSTED',
    CONTRIBUTION_CLEARED = 'CONTRIBUTION_CLEARED',
    CONTRIBUTION_EDITED = 'CONTRIBUTION_EDITED',
    CONTRIBUTION_STOCK_GIFT_RECEIVED = 'CONTRIBUTION_STOCK_GIFT_RECEIVED',
    GRANT_ONE_TIME_REQUEST = 'GRANT_ONE_TIME_REQUEST',
    GRANT_RECURRING_REQUEST = 'GRANT_RECURRING_REQUEST',
    GRANT_PAID = 'GRANT_PAID',
    GRANT_EDITED = 'GRANT_EDITED',
    GRANT_CANCELLED = 'GRANT_CANCELLED',
    GRANT_ON_HOLD = 'GRANT_ON_HOLD',
    GRANT_INSUFFICIENT_FUNDS = 'GRANT_INSUFFICIENT_FUNDS',
    TRANSACTION_FUND_TO_FUND_TRANSFER_REQUESTED = 'TRANSACTION_FUND_TO_FUND_TRANSFER_REQUESTED',
    TRANSACTION_FUND_TO_FUND_TRANSFER_COMPLETED = 'TRANSACTION_FUND_TO_FUND_TRANSFER_COMPLETED',
    INVESTMENT_REALLOCATION_REQUESTED = 'INVESTMENT_REALLOCATION_REQUESTED',
    INVESTMENT_REALLOCATION_COMPELTED = 'INVESTMENT_REALLOCATION_COMPELTED',
    MONEY_MANAGER_ADVISOR_CONFIRMATION_OF_FUNDS_SENT = 'MONEY_MANAGER_ADVISOR_CONFIRMATION_OF_FUNDS_SENT',
    MONEY_MANAGER_ADVISOR_REQUEST_FOR_FUNDS_TRANSFER = 'MONEY_MANAGER_ADVISOR_REQUEST_FOR_FUNDS_TRANSFER'
}

@Entity()
@ObjectType()
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

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
        enum: NotificationType
    })
    @Field(type => String, { nullable: false })
    notificationType: NotificationType;

    // General setting - affects all users
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    @OneToMany(
        type => UserProfileNotification,
        inverse => inverse.notification
    )
    @Field(type => [UserProfileNotification], { nullable: false })
    userProfileNotifications: UserProfileNotification[];

    @ManyToMany(type => UserProfile)
    @JoinTable({ name: 'user_profile_notification' })
    @Field(type => [UserProfile], { nullable: true })
    userProfiles: UserProfile[];
}
