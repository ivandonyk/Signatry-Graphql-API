import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../entities/BaseEntity';
import { ObjectType, Field } from 'type-graphql';
import { Recipient } from './Recipient';
import { Tag } from '.';

@Entity()
@ObjectType()
export class RecipientTag extends BaseEntity {
    // Recipient
    @ManyToOne(
        type => Recipient,
        inverse => inverse.recipientTags
    )
    @Field(type => Recipient)
    recipient: Recipient;

    @Column()
    recipientId: string;

    // Tags
    @ManyToOne(
        type => Tag,
        inverse => inverse.recipientTags
    )
    @Field(type => Tag)
    tag: Tag;

    @Column()
    tagId: string;
}
