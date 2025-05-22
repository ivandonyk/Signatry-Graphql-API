import { ObjectType, Field, Float } from 'type-graphql';

@ObjectType()
export class InvestmentHoldingResult {
    @Field(type => String, { nullable: false })
    name: string;

    @Field(type => Float, { nullable: false })
    marketValue: number;

    @Field(type => Date, { nullable: false })
    date: Date;

    @Field(type => Float, { nullable: false })
    units: number;

    @Field(type => Float, { nullable: false })
    unitPrice: number;
}
