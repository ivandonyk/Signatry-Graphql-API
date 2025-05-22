import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class EditBatchInput {
    @Field(type => ID, { nullable: false })
    batchId: string;

    @Field(type => String, { nullable: true })
    description?: string;

    @Field(type => String, { nullable: true })
    paymentType: string;
}
