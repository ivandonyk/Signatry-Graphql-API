/**
 * @important please check fee.resolver.ts -> adminFeesCount before updating this
 */
import { InputType, Field } from 'type-graphql';
import { TransactionDetailFilter } from '../FundTransactionDetail/FundTransactionDetailFilter';
import { TransactionStatusFilter } from '../TransactionStatus/TransactionStatusFilter';

@InputType()
export class FeeFilter {
    @Field(type => TransactionStatusFilter, { nullable: true })
    transactionStatus: TransactionStatusFilter;
}
