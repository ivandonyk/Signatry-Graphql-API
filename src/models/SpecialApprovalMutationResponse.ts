import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class SpecialApprovalMutationResponse {
    @Field()
    grantId: string;
    @Field()
    specialApproval: boolean;
}
