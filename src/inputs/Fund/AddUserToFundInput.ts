import { InputType, Field } from 'type-graphql';

@InputType()
export class AddUserToFundInput {
    @Field(type => String)
    fundId: string;

    @Field(type => String)
    userProfileId: string;

    @Field(type => String)
    fundRoleId: string;

    @Field(type => String)
    fundRelationshipId: string;
}
