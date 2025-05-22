import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class AddCommentToBatchInput {
    @Field(type => ID, { nullable: false })
    batchId: string;

    @Field(type => String, { nullable: false })
    comment: string;
}
