import { InputType, Field } from 'type-graphql';

import { OrderBy } from '../core/OrderBy';

@InputType()
export class AllTransactionOrderBy {
    @Field(type => OrderBy, { nullable: true })
    transactionDateTime?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    transactionCode?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    amount?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    transactionType?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    transactionStatus?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    fundName?: OrderBy;
}
