import { Recipient } from './Recipient';
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    VersionColumn,
    OneToMany
} from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';

export enum RecipientStatusName {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    DENIED = 'DENIED',
    EXPIRED = 'EXPIRED'
}

@Entity()
@ObjectType()
export class RecipientStatus {
    // Id
    @PrimaryGeneratedColumn('uuid')
    @Field()
    id: string;

    // Name
    @Column({
        type: 'character varying',
        nullable: false,
        enum: RecipientStatusName,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: false })
    name: RecipientStatusName;

    // Description
    @Column({
        type: 'character varying',
        nullable: true,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => String, { nullable: true })
    description: string;

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

    // ordinal
    @Column({
        type: 'integer',
        nullable: false,
        enum: null,
        unique: false,
        default: () => undefined
    })
    @Field(type => Number, { nullable: false })
    ordinal: number;

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

    @OneToMany(
        type => Recipient,
        inverse => inverse.recipientStatus
    )
    @Field(type => [Recipient], { nullable: false })
    recipients: Recipient[];
}
