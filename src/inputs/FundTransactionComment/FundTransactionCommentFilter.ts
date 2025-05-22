import { InputType, Field } from 'type-graphql';

@InputType()
export class FundTransactionCommentFilter {
    @Field(type => Boolean, { nullable: true })
    isHold: boolean;

    @Field(type => Boolean, { nullable: true })
    isCancel: boolean;
}
