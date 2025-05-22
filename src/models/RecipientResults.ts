import { ObjectType, Field } from 'type-graphql';
import { Recipient } from './Recipient';

@ObjectType()
export class RecipientResults {
    @Field()
    timestamp: Date;

    @Field(() => [Recipient])
    data: Recipient[];

    @Field()
    count: number;
}
