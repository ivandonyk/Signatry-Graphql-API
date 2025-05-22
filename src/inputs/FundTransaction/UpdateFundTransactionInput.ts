import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class UpdateFundTransactionInput {
    @Field(type => ID, { nullable: false })
    id: string;

    @Field(type => Boolean, { nullable: true })
    availableBalanceApproved: boolean;
}
