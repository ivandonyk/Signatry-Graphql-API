import { InputType, Field, Int, Float, ID } from 'type-graphql';

@InputType()
export class UserProfilePhoneInput {
    @Field(type => String, { nullable: true })
    id: string;

    @Field(type => String, { nullable: false })
    value: string;

    @Field(type => Boolean, { nullable: false })
    isPrimary: boolean;

    @Field(type => ID, { nullable: false })
    userProfileId: string;
}
