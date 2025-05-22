import { Entity, Column, ManyToOne } from 'typeorm';
import { ObjectType, Field, Int, Float } from 'type-graphql';
import { BaseEntity } from '../entities/BaseEntity';
import { Recipient } from './Recipient';

@Entity()
@ObjectType()
export class RecipientFinancials extends BaseEntity {
    // Recipient
    @ManyToOne(
        type => Recipient,
        inverse => inverse.boardOfDirectors
    )
    @Field(type => Recipient)
    recipient: Recipient;

    @Column()
    recipientId: string;

    @Column({ type: 'int', nullable: true })
    @Field(type => Int, { nullable: true })
    mostRecentFinancialsYear: number | null;

    @Column({ type: 'float', nullable: true })
    @Field(type => Float, { nullable: true })
    totalRevenue: number | null;

    @Column({ type: 'float', nullable: true })
    @Field(type => Float, { nullable: true })
    totalAssets: number | null;

    @Column({ type: 'float', nullable: true })
    @Field(type => Float, { nullable: true })
    totalExpenses: number | null;

    @Column({ type: 'character varying', nullable: true })
    @Field(type => String, { nullable: true })
    irsFilingsLink: string | null;

    @Column({ type: 'character varying', nullable: true })
    @Field(type => String, { nullable: true })
    fullFinancialReportLink: string | null;
}
