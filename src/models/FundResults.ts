import { ObjectType, Field } from 'type-graphql';
import { Fund } from './Fund';

@ObjectType()
export class FundResults {
    @Field()
    timestamp: Date;

    @Field(() => [Fund])
    data: Fund[];

    @Field()
    count: number;
}
