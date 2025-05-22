import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateFundAddressInput {
    @Field()
    address1: string;

    @Field(type => String, { nullable: true })
    address2: string;

    @Field()
    city: string;

    @Field()
    state: string;

    @Field()
    zip: string;
}
