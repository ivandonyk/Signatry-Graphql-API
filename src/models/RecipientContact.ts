import { Recipient } from './Recipient';
import { RecipientContactPhone } from './RecipientContactPhone';
import { RecipientContactAddress } from './RecipientContactAddress';
import { RecipientContactEmail } from './RecipientContactEmail';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    JoinColumn,
    OneToMany,
    OneToOne
} from 'typeorm';
import { ObjectType, Field } from 'type-graphql';

@Entity()
@ObjectType()
export class RecipientContact {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Org contact name
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    orgContactName: string;

    // User Profile Id (Used for Linked User Profiles)
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => null
    })
    @Field(type => String, { nullable: true })
    userProfileId: string;

    // Is Primary
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Boolean, { nullable: false })
    isPrimary: boolean;

    // Is Grant Contact
    @Column({
        type: 'boolean',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Boolean, { nullable: false })
    isGrantContact: boolean;

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

    // Recipient
    @JoinColumn()
    @OneToOne(
        type => Recipient,
        inverse => inverse.contact
    )
    @Field(type => Recipient, { nullable: false })
    recipient: Recipient;
    @Column({ nullable: false })
    recipientId: string;

    // RecipientContactPhones
    @OneToMany(
        type => RecipientContactPhone,
        inverse => inverse.recipientContact
    )
    @Field(type => [RecipientContactPhone], { nullable: true })
    phones: RecipientContactPhone[];

    // Primary Phone
    @OneToOne(
        type => RecipientContactPhone,
        inverse => inverse.recipientContact
    )
    @Field(type => RecipientContactPhone, { nullable: true })
    primaryPhone: RecipientContactPhone;

    // RecipientContactAddress
    @OneToMany(
        type => RecipientContactAddress,
        inverse => inverse.recipientContact
    )
    @Field(type => [RecipientContactAddress], { nullable: true })
    addresses: RecipientContactAddress[];

    // Primary address
    @OneToOne(
        type => RecipientContactAddress,
        inverse => inverse.recipientContact
    )
    @Field(type => RecipientContactAddress, { nullable: true })
    primaryAddress: RecipientContactAddress;

    // Donation Address (determined by GuideStar) - the address, if any, where summary.addresses[i].address_type === 'Payment/Donation Address'
    @OneToOne(
        type => RecipientContactAddress,
        inverse => inverse.recipientContact
    )
    @Field(type => RecipientContactAddress, { nullable: true })
    donationAddress: RecipientContactAddress;

    // RecipientContactEmails
    @OneToMany(
        type => RecipientContactEmail,
        inverse => inverse.recipientContact
    )
    @Field(type => [RecipientContactEmail], { nullable: true })
    emails: RecipientContactEmail[];

    // Primary email
    @OneToOne(
        type => RecipientContactEmail,
        inverse => inverse.recipientContact
    )
    @Field(type => RecipientContactEmail, { nullable: true })
    primaryEmail: RecipientContactEmail;
}
