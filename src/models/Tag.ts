import { Entity, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { ObjectType, Field } from 'type-graphql';
import { Recipient } from './Recipient';
import { RecipientTag } from './RecipientTag';

@Entity()
@ObjectType()
export class Tag extends BaseEntity {
    // Name
    @Column({ type: 'character varying' })
    @Field(type => String, { nullable: false })
    name: string;

    // Display Name
    @Column({ type: 'character varying' })
    @Field(type => String, { nullable: false })
    displayName: string;

    // Recipients
    @ManyToMany(type => Recipient)
    @JoinTable({ name: 'recipient_tag' })
    @Field(type => [Recipient], { nullable: true })
    recipients: Recipient[];

    // Recipient tags
    @OneToMany(
        type => RecipientTag,
        inverse => inverse.recipient
    )
    @Field(type => [RecipientTag], { nullable: true })
    recipientTags: RecipientTag[];
}
