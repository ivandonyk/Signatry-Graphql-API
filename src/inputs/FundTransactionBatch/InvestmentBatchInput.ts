import { InputType, Field, Float } from 'type-graphql';

@InputType()
export class FundTransactionBatchInput {
    @Field(type => [String], { nullable: false })
    ids: string[];
}
