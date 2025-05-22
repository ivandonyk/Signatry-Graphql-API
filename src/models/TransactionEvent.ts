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
import { FundTransaction } from './FundTransaction';
import { UserProfile } from './UserProfile';
import { TransactionStatusValue } from './TransactionStatus';

export enum EventNameValue {
    SUBMITTED = 'SUBMITTED',
    DUE_DILIGENCE_STARTED = 'DUE_DILIGENCE_STARTED',
    REVIEW_STARTED = 'REVIEW_STARTED',
    PAYMENTS_STARTED = 'PAYMENTS_STARTED',
    ON_HOLD = 'ON_HOLD',
    OFF_HOLD = 'OFF_HOLD',
    FINAL_REVIEW_APPROVED = 'FINAL_REVIEW_APPROVED',
    SPECIAL_APPROVAL_GIVEN = 'SPECIAL_APPROVAL_GIVEN',
    AVAILABLE_BALANCE_APPROVED = 'AVAILABLE_BALANCE_APPROVED',
    CHARITY_VETTED = 'CHARITY_VETTED',
    PURPOSE_NOTES_APPROVED = 'PURPOSE_NOTES_APPROVED',
    SPECIAL_INSTRUCTIONS_APPROVED = 'SPECIAL_INSTRUCTIONS_APPROVED',
    COMPLETE = 'COMPLETE',
    CANCELED = 'CANCELED',
    PROCESSED = 'PROCESSED',
    REQUESTED = 'REQUESTED',
    EDITED = 'EDITED',
    DIVESTED = 'DIVESTED',
    INVESTED = 'INVESTED',
    POSTED = 'POSTED',
    CREATED = 'CREATED'
}

export const eventNameFromStatusName = (newStatus: string): EventNameValue | null => {
    switch (newStatus) {
        case TransactionStatusValue.IN_DUE_DILIGENCE:
            return EventNameValue.DUE_DILIGENCE_STARTED;
        case TransactionStatusValue.IN_REVIEW:
            return EventNameValue.REVIEW_STARTED;
        case TransactionStatusValue.APPROVED:
            return EventNameValue.PAYMENTS_STARTED;
        case TransactionStatusValue.COMPLETE:
            return EventNameValue.COMPLETE;
        case TransactionStatusValue.SUBMITTED:
        case TransactionStatusValue.NEW:
            return EventNameValue.SUBMITTED;
        case TransactionStatusValue.CANCELED:
            return EventNameValue.CANCELED;
        case TransactionStatusValue.PENDING:
            return EventNameValue.PROCESSED;
        case 'EDITED':
            return EventNameValue.EDITED;
        case 'DIVESTED':
            return EventNameValue.DIVESTED;
        case 'INVESTED':
            return EventNameValue.INVESTED;
        case 'POSTED':
            return EventNameValue.POSTED;
        case 'CREATED':
            return EventNameValue.CREATED;
        default:
            return null;
    }
};

@Entity()
@ObjectType()
export class TransactionEvent {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Name
    @Column({
        type: 'character varying',
        nullable: false,
        enum: EventNameValue,
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

    // Parent Event
    @ManyToOne(
        type => TransactionEvent,
        inverse => inverse.childEvents
    )
    @Field(type => TransactionEvent, { nullable: true })
    parentEvent: TransactionEvent;
    @Column({ nullable: true })
    parentEventId: string;

    // Children Events
    @OneToMany(
        type => TransactionEvent,
        inverse => inverse.parentEvent
    )
    @Field(type => [TransactionEvent], { nullable: true })
    childEvents: TransactionEvent[];

    // Version
    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    // Transaction Status Id
    @ManyToOne(
        type => FundTransaction,
        inverse => inverse.transactionEvents
    )
    @Field(type => FundTransaction, { nullable: false })
    fundTransaction: FundTransaction;
    @Column({ nullable: false })
    fundTransactionId: string;

    // Transaction Status Id
    @ManyToOne(
        type => UserProfile,
        inverse => inverse.transactionEvents
    )
    @Field(type => UserProfile, { nullable: false })
    userProfile: UserProfile;
    @Column({ nullable: false })
    userProfileId: string;
}
