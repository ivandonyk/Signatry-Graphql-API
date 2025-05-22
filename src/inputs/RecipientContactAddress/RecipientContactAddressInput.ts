import { InputType, Field, Float, ID } from 'type-graphql';

@InputType()
export class RecipientContactAddressInput {
    @Field(type => ID, { nullable: true })
    id: string;

    @Field(type => String, { nullable: true })
    lineOne: string;

    @Field(type => String, { nullable: true })
    lineTwo: string;

    @Field(type => String, { nullable: true })
    city: string;

    @Field(type => String, { nullable: true })
    state: string;

    @Field(type => String, { nullable: true })
    postalCode: string;

    @Field(type => String, { nullable: true })
    country: string;
}
