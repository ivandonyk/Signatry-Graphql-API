import { RecipientEvent } from './RecipientEvent';
import { FundTransactionInfo } from './FundTransactionInfo';
import { Cause } from './Cause';
import { Tag } from './Tag';
import { RecipientContact } from './RecipientContact';
import { RecipientStatus } from './RecipientStatus';
import { RecipientTag } from './RecipientTag';
import { RecipientCause } from './RecipientCause';
import { RecipientBoardOfDirectorsMember } from './RecipientBoardOfDirectorsMember';
import { RecipientFinancials } from './RecipientFinancials';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    ManyToMany,
    JoinTable
} from 'typeorm';
import { ObjectType, Field, Int, registerEnumType } from 'type-graphql';
import { TransactionRecurrence } from './TransactionRecurrence';
import { RecipientComment } from './RecipientComment';
import { RecipientPreferredPayment } from './RecipientPreferredPaymentType';

export enum PaymentTypeValue {
    ACH = 'ACH',
    CHECK = 'Check',
    WIRE = 'Wire'
}

registerEnumType(PaymentTypeValue, {
    name: 'PaymentTypeValue',
    description: 'Available payment types'
});

export enum SpecialRecognitionOptions {
    IN_CELEBRATION_OF = 'In celebration of',
    IN_GRATITUDE_FOR = 'In gratitude for',
    IN_HONOR_OF = 'In honor of',
    IN_LOVING_MEMORY_OF = 'In loving memory of',
    IN_RECOGNITION = 'In recognition of',
    IN_THE_NAME_OF = 'In the name of',
    ON_BEHALF_OF = 'On behalf of',
    OTHER = 'Other'
}

export enum SpecificNeedOptions {
    ATHLETIC_TEAM_SUPPORT = 'Athletic Team Support',
    BENEVOLENCE_FUND = 'Benevolence Fund',
    CAPITAL_OR_BUILDING_CAMPAIGN = 'Capital/Building Campaign',
    CHARITY_EVENT = 'Charity Event',
    MEMBERSHIP = 'Membership',
    PLEDGE = 'PLEDGE',
    OTHER = 'OTHER'
}

export enum GuideStarSeal {
    'Platinum',
    'Gold',
    'Silver',
    'Bronze'
}

@Entity()
@ObjectType()
export class Recipient {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // RecipientCode
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: true,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    recipientCode: string;

    // Name
    @Column({ type: 'character varying' })
    @Field(type => String, { nullable: false })
    name: string;

    // Description
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    description: string;

    // EIN
    @Column({
        type: 'character varying'
    })
    @Field(type => String, { nullable: false })
    ein: string;

    // Enabled
    @Column({
        type: 'boolean',
        default: () => true
    })
    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    // Vetted On
    @Column({ nullable: true })
    @Field()
    vettedOn: Date;

    // Name
    @Column({
        type: 'character varying',
        nullable: true,
        enum: PaymentTypeValue,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    paymentType: string;

    // Charity Code
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    code: string;

    // Recipient Website
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    website: string;

    // NPO status
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    npoStatus: string;

    // NTEE code
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    nteeCode: string;

    // OFAC status
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    ofac: string;

    // pub78 verified
    @Column({
        type: 'boolean',
        nullable: false
    })
    @Field(type => Boolean, { nullable: false })
    pub78: boolean;

    // Created On
    @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    createdOn: Date;

    // Created By
    @Column({ type: 'character varying' })
    createdBy: string;

    // Updated On
    @UpdateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
    @Field()
    updatedOn: Date;

    // Updated By
    @Column({ type: 'character varying' })
    updatedBy: string;

    // Version
    @VersionColumn({ default: 1 })
    @Field()
    version: number;

    @Field(type => [String])
    @Column({
        type: 'text',
        array: true
    })
    photos: string[];

    @Field(type => String, { nullable: true })
    @Column({
        type: 'text',
        nullable: true
    })
    logo: string;

    @Field(type => String, { nullable: true })
    @Column({
        type: 'text',
        nullable: true
    })
    banner: string;

    @Field(type => String, { nullable: true })
    @Column({
        name: 'guidestar_seal',
        type: 'text',
        nullable: true,
        enum: GuideStarSeal
    })
    guideStarSeal: GuideStarSeal;

    // BMF Org Name
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    bmfOrganizationName: string;

    // foundation type code
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    foundationTypeCode: string;

    //foundation type description
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    foundationTypeDescription: string;

    // also known as
    @Column({
        type: 'character varying',
        nullable: true
    })
    @Field(type => String, { nullable: true })
    alsoKnownAs: string;

    // Tags
    @ManyToMany(type => Tag)
    @JoinTable({ name: 'recipient_tag' })
    @Field(type => [Tag], { nullable: true })
    tags: Tag[];

    // Causes
    @ManyToMany(type => Cause)
    @JoinTable({ name: 'recipient_cause' })
    @Field(type => [Cause], { nullable: true })
    causes: Cause[];

    // Primary Cause
    @OneToOne(type => Cause)
    @Field(type => Cause, { nullable: true })
    primaryCause: Cause;

    // Recipient status
    @ManyToOne(
        type => RecipientStatus,
        inverse => inverse.recipients
    )
    @Field(type => RecipientStatus, { nullable: false })
    recipientStatus: RecipientStatus;
    @Column({ nullable: false })
    recipientStatusId: string;

    // Recipient approval expiration date
    @Column({
        name: 'approval_expiration_date',
        type: 'timestamp',
        nullable: true // null when recipient_status not "APPROVED"
    })
    @Field(type => Date, { nullable: true })
    approvalExpirationDate: Date | null;

    // Recipient contacts
    @OneToMany(
        type => RecipientContact,
        inverse => inverse.recipient
    )
    @Field(type => [RecipientContact], { nullable: false })
    contacts: RecipientContact[];

    // Recipient primary contact
    @OneToOne(
        type => RecipientContact,
        inverse => inverse.recipient
    )
    @Field(type => RecipientContact, { nullable: false })
    contact: RecipientContact;

    // Recipient Event
    @OneToMany(
        type => RecipientEvent,
        inverse => inverse.recipient
    )
    @Field(type => [RecipientEvent], { nullable: true })
    recipientEvents: RecipientEvent[];

    // Recipient primary contact
    @OneToOne(
        type => TransactionRecurrence,
        inverse => inverse.recipient
    )
    @Field(type => TransactionRecurrence, { nullable: false })
    transactionRecurrence: TransactionRecurrence;

    // Fund Transaction Detail
    @OneToMany(
        type => FundTransactionInfo,
        inverse => inverse.recipient
    )
    @Field(type => [FundTransactionInfo], { nullable: true })
    fundDestinations: FundTransactionInfo[];

    // Recipient comments
    @OneToMany(
        type => RecipientComment,
        inverse => inverse.recipient
    )
    @Field(type => [RecipientComment], { nullable: true })
    recipientComments: RecipientComment[];

    // Recipient tags
    @OneToMany(
        type => RecipientTag,
        inverse => inverse.recipient
    )
    @Field(type => [RecipientTag], { nullable: true })
    recipientTags: RecipientTag[];

    // Recipient causes
    @OneToMany(
        type => RecipientCause,
        inverse => inverse.recipient
    )
    @Field(type => [RecipientCause], { nullable: true })
    recipientCauses: RecipientCause[];

    // Recipient Board of Directors (GuideStar)
    @OneToMany(
        type => RecipientBoardOfDirectorsMember,
        inverse => inverse.recipient
    )
    @Field(type => [RecipientBoardOfDirectorsMember], { nullable: false })
    boardOfDirectors: RecipientBoardOfDirectorsMember[];

    @OneToOne(
        type => RecipientFinancials,
        inverse => inverse.recipient
    )
    @Field(type => RecipientFinancials, { nullable: true })
    financials: RecipientFinancials;

    @Field(type => [String])
    @Column({
        type: 'text',
        array: true
    })
    keywords: string[];

    @Column({
        type: 'text',
        array: true
    })
    socialMediaLinks: string[];

    // Recipient payments
    @OneToMany(
        type => RecipientPreferredPayment,
        inverse => inverse.recipient
    )
    @Field(type => [RecipientPreferredPayment], { nullable: true })
    recipientPreferredPayments: RecipientPreferredPayment[];

    @Column({
        type: 'integer',
        nullable: true
    })
    @Field(type => Int, { nullable: true })
    numberOfEmployees: number;

    @Column({
        type: 'text',
        nullable: true,
        name: 'guidestar_public_profile_link'
    })
    @Field({ nullable: true })
    guideStarPublicProfileLink: string;

    @Column({ type: 'character varying', nullable: true })
    @Field(type => String, { nullable: true })
    accountingVendorId: string;
}
