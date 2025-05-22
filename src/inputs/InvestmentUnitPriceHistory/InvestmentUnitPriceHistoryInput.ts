import { InputType, Field, Int, Float, ID } from 'type-graphql';

@InputType()
export class InvestmentUnitPriceHistoryInput {
    @Field(type => String, { nullable: true })
    id: string;

    @Field(type => Float, { nullable: false })
    closePrice: number;

    @Field(type => Date, { nullable: true })
    closePriceAsOf: Date;

    @Field(type => ID, { nullable: false })
    investmentId: string;
}
