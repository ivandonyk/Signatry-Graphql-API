import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateUserProfileAccountInput {
    @Field()
    userProfileId: string;

    @Field()
    accountId: string;

    @Field()
    publicToken: string;
}
