import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
export class RecurringGrantsCounts {
    @Field(type => Int)
    active: number;

    @Field(type => Int)
    expired: number;

    @Field(type => Int)
    all: number;
}
