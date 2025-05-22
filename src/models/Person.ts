import { ObjectType, Field } from 'type-graphql';
import { Fund } from './Fund';

@ObjectType()
export class Person {
    @Field()
    name: string;

    @Field()
    email: string;

    @Field({ nullable: true })
    role: string;

    @Field()
    userProfileId: string;

    @Field({ nullable: true })
    username: string;

    @Field(type => [Fund])
    funds: Fund[];
}
