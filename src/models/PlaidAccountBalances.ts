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

@ObjectType()
export class PlaidAccountBalances {
    @Field(type => String, { nullable: true })
    available: string;

    @Field(type => String, { nullable: true })
    current: string;

    @Field(type => String, { nullable: true })
    limit: string;

    @Field(type => String, { nullable: true })
    isoCurrencyCode: string;

    @Field(type => String, { nullable: true })
    unofficialCurrencyCode: string;
}
