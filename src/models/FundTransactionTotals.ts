import { ObjectType, Field, Float } from 'type-graphql';

@ObjectType()
export class FundTransactionTotals {
    @Field(type => Float, { nullable: true })
    contributions?: number;

    @Field(type => Float, { nullable: true })
    grants?: number;

    @Field(type => Float, { nullable: true })
    expenses?: number;

    @Field(type => Float, { nullable: true })
    transfers?: number;
}
