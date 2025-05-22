import { InputType, Field, Float, ObjectType } from 'type-graphql';

@InputType()
export class InvestmentInput {
    @Field()
    investmentId: string;

    @Field(type => Float, { nullable: true })
    percentage?: number;
}

@ObjectType()
export class InvestmentResults {
    @Field()
    investmentId: string;

    @Field(type => Float, { nullable: true })
    allocationPercentage?: number;

    @Field(type => Float, { nullable: true })
    divestmentPercentage?: number;
}
