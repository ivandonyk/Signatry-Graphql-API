import { InputType, Field } from 'type-graphql';

@InputType()
export class AddPendingUserToFundInput {
    @Field(type => String)
    fundId: string;

    @Field(type => String)
    email: string;

    @Field(type => String)
    fundRoleId: string;

    @Field(type => String)
    fundRelationshipId: string;
}
