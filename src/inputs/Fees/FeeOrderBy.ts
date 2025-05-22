import { InputType, Field } from 'type-graphql';

import { OrderBy } from '../core/OrderBy';
import { FundOrderBy } from '../Fund/FundOrderBy';
import { TransactionTypeOrderBy } from '../TransactionType/TransactionTypeOrderBy';
import { TransactionStatusOrderBy } from '../TransactionStatus/TransactionStatusOrderBy';

@InputType()
export class FeeOrderBy {
    @Field(type => OrderBy, { nullable: true })
    transactionDateTime?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    transactionCode?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    amount?: OrderBy;

    @Field(type => TransactionTypeOrderBy, { nullable: true })
    transactionType: TransactionTypeOrderBy;

    @Field(type => FundOrderBy, { nullable: true })
    fund: FundOrderBy;

    @Field(type => TransactionStatusOrderBy, { nullable: true })
    transactionStatus: TransactionStatusOrderBy;

    @Field(type => OrderBy, { nullable: true })
    divestmentStatus?: OrderBy;
}
