import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { ObjectType, Field, Int } from 'type-graphql';
import { Recipient } from './Recipient';
import { Cause } from './Cause';

@Entity()
@ObjectType()
export class RecipientCause extends BaseEntity {
    // Recipient
    @ManyToOne(
        type => Recipient,
        inverse => inverse.recipientCauses
    )
    @Field(type => Recipient)
    recipient: Recipient;

    @Column()
    recipientId: string;

    // Cause
    @ManyToOne(
        type => Cause,
        inverse => inverse.recipientCauses
    )
    @Field(type => Cause)
    cause: Cause;

    @Column()
    causeId: string;

    @Column({ type: 'boolean' })
    @Field()
    isPrimary: boolean;

    @Column({ default: 1 })
    @Field(type => Int)
    ordinal: number;
}
