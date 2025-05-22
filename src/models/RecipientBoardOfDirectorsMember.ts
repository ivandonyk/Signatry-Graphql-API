import { Entity, Column, ManyToOne } from 'typeorm';
import { ObjectType, Field } from 'type-graphql';
import { BaseEntity } from '../entities/BaseEntity';
import { Recipient } from './Recipient';

@Entity()
@ObjectType()
export class RecipientBoardOfDirectorsMember extends BaseEntity {
    // Recipient
    @ManyToOne(
        type => Recipient,
        inverse => inverse.boardOfDirectors
    )
    @Field(type => Recipient)
    recipient: Recipient;

    @Column()
    recipientId: string;

    // Board member name: API sometimes returns whitespace or empty strings for this field
    @Column({ type: 'character varying', nullable: true })
    @Field({ nullable: true })
    name: string | null;

    // Board member title
    @Column({ type: 'character varying', nullable: true })
    @Field({ nullable: true })
    title: string | null;

    // Board Member Company: API sometims returns whitespace or empty string for this field
    @Column({ type: 'character varying', nullable: true })
    @Field({ nullable: true })
    company: string | null;

    // Principal Board Member
    @Column({ type: 'boolean', default: () => false })
    @Field(type => Boolean)
    isPrimary: boolean;
}
