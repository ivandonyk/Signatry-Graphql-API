import { PlaidAccountBalances } from './PlaidAccountBalances';
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
import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class PlaidAccount {
    @Field(type => String, { nullable: false })
    accountId: string;

    @Field(type => String, { nullable: true })
    name: string;

    @Field(type => String, { nullable: true })
    mask: string;

    @Field(type => String, { nullable: true })
    officialName: string;

    @Field(type => String, { nullable: true })
    subtype: string;

    @Field(type => String, { nullable: true })
    type: string;

    @Field(type => String, { nullable: true })
    verificationStatus: string;

    @Field(type => PlaidAccountBalances, { nullable: false })
    balances: PlaidAccountBalances;
}
