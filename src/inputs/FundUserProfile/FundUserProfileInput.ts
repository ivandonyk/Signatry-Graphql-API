import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class FundUserProfileInput {
    @Field(type => String, { nullable: true })
    id: string;

    @Field(type => ID, { nullable: false })
    userProfileId: string;

    @Field(type => ID, { nullable: false })
    fundId: string;
}
