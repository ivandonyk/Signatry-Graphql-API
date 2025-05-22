import { Entity, Column, ManyToMany, JoinTable, OneToMany, Generated } from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { ObjectType, Field, Int } from 'type-graphql';
import { Recipient } from './Recipient';
import { RecipientCause } from './RecipientCause';

@Entity()
@ObjectType()
export class Cause extends BaseEntity {
    // Cause Code
    @Column()
    @Generated('increment')
    code: number;

    // Name
    @Column({ type: 'character varying' })
    @Field(type => String, { nullable: false })
    name: string;

    // Primary NTEE Code
    @Column({ type: 'character varying' })
    @Field(type => String, { nullable: true })
    primaryCode: string;

    // Description
    @Column({ type: 'character varying' })
    @Field(type => String, { nullable: true })
    description: string;

    @Column({ type: 'character varying' })
    @Field(type => String, { nullable: true })
    photo: string;

    // Recipients
    @ManyToMany(type => Recipient)
    @JoinTable({ name: 'recipient_cause' })
    @Field(type => [Recipient], { nullable: true })
    recipients: Recipient[];

    // Recipient causes
    @OneToMany(
        type => RecipientCause,
        inverse => inverse.cause
    )
    @Field(type => [RecipientCause], { nullable: true })
    recipientCauses: RecipientCause[];

    @Field(type => Int, { defaultValue: 0 })
    recentGrantCount: number;
}
