import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class AdminGrantsByStatusResult {
    @Field()
    name: string;

    @Field()
    count: number;

    @Field()
    sum: number;

    @Field({ nullable: true })
    selectable?: number;
}
