import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class MoneyMovementInstructionsInput {
    @Field(type => String, { nullable: true })
    batchId: string;

    @Field(type => String, { nullable: true })
    accountName: string;

    @Field(type => String, { nullable: true })
    toEmail: string;

    @Field(type => Boolean, { nullable: true })
    isIMA: boolean;
}
