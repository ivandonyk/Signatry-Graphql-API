import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class UpdateGrantInput {
    @Field(type => ID, { nullable: true })
    id: string;

    @Field(type => Boolean, { nullable: true })
    specialApproval: boolean;

    @Field(type => Boolean, { nullable: true })
    finalReview: boolean;
}
