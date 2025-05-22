import { InputType, Field, Int, Float, ID } from 'type-graphql';

@InputType()
export class FundInvestmentInput {
    @Field(type => String, { nullable: true })
    id: string;

    @Field(type => Float, { nullable: false })
    allocationPercentage: number;

    @Field(type => ID, { nullable: false })
    fundId: string;

    @Field(type => ID, { nullable: false })
    investmentId: string;
}
