import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class FinalReviewMutationResponse {
    @Field()
    grantId: string;
    @Field()
    finalReview: boolean;
}
