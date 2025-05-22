import { InputType, Field } from 'type-graphql';

@InputType()
export class UpdateUserProfileAddressInput {
    @Field(type => String, { nullable: false })
    lineOne: string;

    @Field(type => String, { nullable: true })
    lineTwo: string;

    @Field(type => String, { nullable: true })
    lineThree: string;

    @Field(type => String, { nullable: false })
    city: string;

    @Field(type => String, { nullable: false })
    state: string;

    @Field(type => String, { nullable: false })
    postalCode: string;

    @Field(type => String, { nullable: false })
    country: string;
}
