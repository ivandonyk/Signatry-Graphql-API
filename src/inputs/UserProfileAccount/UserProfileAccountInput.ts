import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class UserProfileAccountInput {
    @Field(type => String, { nullable: true })
    id: string;

    @Field(type => Boolean, { nullable: false })
    enabled: boolean;

    @Field(type => String, { nullable: false })
    accessToken: string;

    @Field(type => String, { nullable: true })
    accountId: string;

    @Field(type => String, { nullable: false })
    institutionId: string;

    @Field(type => String, { nullable: false })
    itemId: string;

    @Field(type => ID, { nullable: false })
    userProfileId: string;
}
