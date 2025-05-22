import { InputType, Field, Int, Float, ID } from 'type-graphql';

@InputType()
export class UserProfileAddressInput {
    @Field(type => String, { nullable: true })
    id: string;

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

    @Field(type => Boolean, { nullable: false })
    isPrimary: boolean;

    @Field(type => ID, { nullable: false })
    userProfileId: string;
}
