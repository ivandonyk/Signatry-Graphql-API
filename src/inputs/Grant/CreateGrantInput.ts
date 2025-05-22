import { InputType, Field, ID } from 'type-graphql';
import { EntityManager } from 'typeorm';
import { GraphQLContext } from '../../context';
import { CreateGrantRecommendationInput } from '../FundTransaction/CreateGrantRecommendationInput';

@InputType()
export class CreateGrantInput {
    @Field()
    manager: EntityManager;
    @Field(type => String, { nullable: false })
    recipientId: string;
    @Field(type => String, { nullable: false })
    userProfileId: string;
    @Field()
    input: CreateGrantRecommendationInput;
    @Field({ nullable: true })
    context: GraphQLContext;
}
