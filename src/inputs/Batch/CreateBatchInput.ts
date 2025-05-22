import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class CreateBatchInput {
    @Field(type => [ID], { nullable: false })
    omittedTransactionDetailIds: string[];
}

@InputType()
export class CreatePaymentBatchInput {
    @Field(type => [ID], { nullable: false })
    includedTransactionIds: string[];
}
