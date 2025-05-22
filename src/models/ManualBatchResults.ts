import { ObjectType, Field } from 'type-graphql';
import { Batch } from './Batch';

@ObjectType()
export class ManualBatchResults {
    @Field()
    timestamp: Date;

    @Field(() => Batch)
    data: Batch;

    @Field()
    count: number;
}
