import { InputType, Field } from 'type-graphql';

@InputType()
export class RecipientCommentInput {
    @Field()
    recipientId: string;
    @Field()
    comment: string;
}
