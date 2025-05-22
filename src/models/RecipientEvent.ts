import { RecipientPaymentChanges } from './RecipientPaymentChanges';
import { PaymentTypeValue } from './Recipient';
import { ObjectType, Field } from 'type-graphql';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    ManyToOne,
    OneToMany
} from 'typeorm';
import { UserProfile } from './UserProfile';
import { Recipient } from '.';

export enum RecipientEventNameValues {
    PREFERRED_PAYMENT_EDITED = 'PREFERRED PAYMENT EDITED',
    EDITED = 'EDITED',
    APPROVED = 'APPROVED',
    DENIED = 'DENIED',
    EXPIRED = 'EXPIRED'
}

@Entity()
@ObjectType()
export class RecipientEvent {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Name
    @Column({
        type: 'character varying',
        nullable: false,
        enum: RecipientEventNameValues,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    name: string;

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

    // JSONB column to keep track of payment changes
    @Column({
        type: 'jsonb',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => RecipientPaymentChanges, { nullable: true })
    paymentChanges: RecipientPaymentChanges;

    // Recipient ID
    @ManyToOne(
        type => Recipient,
        inverse => inverse.recipientEvents
    )
    @Field(type => Recipient, { nullable: false })
    recipient: Recipient;
    @Column({ nullable: false })
    recipientId: string;

    // User Profile
    @ManyToOne(
        type => UserProfile,
        inverse => inverse.recipientEvents
    )
    @Field(type => UserProfile, { nullable: false })
    userProfile: UserProfile;
    @Column({ nullable: false })
    userProfileId: string;
}
