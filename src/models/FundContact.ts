import { Fund } from './Fund';
import { FundContactPhone } from './FundContactPhone';
import { FundContactAddress } from './FundContactAddress';
import { FundContactEmail } from './FundContactEmail';
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
export class FundContact {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // First Name
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    firstName: string;

    // middle Name
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    middleName: string;

    // Last Name
    @Column({
        type: 'character varying',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    lastName: string;

    // suffix
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    suffix: string;

    // Prefix
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => null
    })
    @Field(type => String, { nullable: true })
    prefix: string;

    // Date of Birth
    @Column({
        type: 'date',
        nullable: true,
        enum: null,
        unique: false,
        default: () => null
    })
    @Field(type => Date, { nullable: true })
    dob: Date;

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

    // FundId
    @ManyToOne(
        type => Fund,
        inverse => inverse.contact
    )
    @Field(type => Fund, { nullable: false })
    fund: Fund;
    @Column({ nullable: false })
    fundId: string;

    // FundContactPhone
    @OneToMany(
        type => FundContactPhone,
        inverse => inverse.fundContact
    )
    @Field(type => [FundContactPhone], { nullable: true })
    phones: FundContactPhone[];

    // FundContactAddress
    @OneToMany(
        type => FundContactAddress,
        inverse => inverse.fundContact
    )
    @Field(type => [FundContactAddress], { nullable: true })
    addresses: FundContactAddress[];

    // FundContactEmail
    @OneToMany(
        type => FundContactEmail,
        inverse => inverse.fundContact
    )
    @Field(type => [FundContactEmail], { nullable: true })
    emails: FundContactEmail[];
}
