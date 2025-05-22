import { ObjectType, Field } from 'type-graphql';

import { GLAccount, Batch } from '.';
import { BatchStatusValue } from './Batch';

@ObjectType()
export class BatchResults {
    @Field()
    timestamp: Date;

    @Field(() => [Batch])
    data: Batch[];

    @Field()
    count: number;

    @Field()
    allFundsHaveSufficientBalance?: boolean;
}
