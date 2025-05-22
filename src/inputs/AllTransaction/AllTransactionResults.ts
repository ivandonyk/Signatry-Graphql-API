import { ObjectType, Field } from 'type-graphql';

import { AllTransactionView } from '../../models/views/AllTransactionView';

@ObjectType()
export class AllTransactionResults {
    @Field()
    timestamp: Date;

    @Field(() => [AllTransactionView])
    data?: AllTransactionView[];

    @Field()
    count: number;

    @Field()
    totalCount?: number;
}
