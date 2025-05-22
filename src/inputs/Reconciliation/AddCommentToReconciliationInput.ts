import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class AddCommentToReconciliationInput {
    @Field(type => ID, { nullable: false })
    reconciliationId: string;

    @Field(type => String, { nullable: false })
    glAccountId: string;

    @Field(type => String, { nullable: false })
    comment: string;
}
