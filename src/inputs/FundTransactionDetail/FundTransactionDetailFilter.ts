import { InputType, Field, ID } from 'type-graphql';

import { NumberFilter } from '../core/NumberFilter';
import { TransactionDetailTypeFilter } from '../TransactionDetailType/TransactionDetailTypeFilter';
import { TransactionDetailStatusFilter } from '../TransactionDetailStatus/TransactionDetailStatusFilter';

@InputType()
export class TransactionDetailFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => NumberFilter, { nullable: true })
    amount: NumberFilter;

    @Field(type => TransactionDetailTypeFilter, { nullable: true })
    transactionDetailType: TransactionDetailTypeFilter;

    @Field(type => TransactionDetailStatusFilter, { nullable: true })
    transactionDetailStatus: TransactionDetailStatusFilter;
}
