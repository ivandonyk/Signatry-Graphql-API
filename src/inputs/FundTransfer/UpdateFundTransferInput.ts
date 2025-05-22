import { InputType, Field, Float } from 'type-graphql';

@InputType()
export class UpdateFundTransferInput {
    @Field(type => String, { nullable: true })
    toFundId?: string;

    @Field(type => String, { nullable: true })
    fromFundId?: string;
}
