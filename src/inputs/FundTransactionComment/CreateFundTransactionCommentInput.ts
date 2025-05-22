import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateFundTransactionCommentInput {
    @Field()
    fundTransactionId: string;

    @Field()
    comment: string;

    @Field({ nullable: true, defaultValue: false })
    isHold: boolean;

    @Field({ nullable: true, defaultValue: false })
    isCancel: boolean;
}
