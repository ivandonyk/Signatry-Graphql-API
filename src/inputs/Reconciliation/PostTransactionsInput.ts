import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class MatchedTransactionInput {
    @Field(type => String, { nullable: true })
    institutionAccountTransactionId: string;

    @Field(type => String, { nullable: true })
    batchId: string;
}
