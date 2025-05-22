import { ObjectType, Field } from 'type-graphql';
import { Person } from './Person';

@ObjectType()
export class PersonSearchResults {
    @Field()
    count: number;

    @Field(type => [Person])
    data: Person[];
}
