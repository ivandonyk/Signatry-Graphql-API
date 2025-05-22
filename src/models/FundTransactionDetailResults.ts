import { ObjectType, Field } from 'type-graphql';
import { FundTransactionDetail } from './FundTransactionDetail';

@ObjectType()
export class FundTransactionDetailResults {
    @Field()
    timestamp: Date;

    @Field(() => [FundTransactionDetail])
    data?: FundTransactionDetail[];

    @Field()
    count: number;

    @Field(() => [String])
    filteredOutIds?: string[];

    @Field()
    filteredOutAmount?: number;

    @Field()
    totalCount?: number;

    @Field()
    totalAmount?: number;

    @Field()
    unselectableAmount?: number;

    @Field(() => [String])
    unselectableIds?: string[];
}

@ObjectType()
export class FundTransactionDetailSummaryResults {
    @Field()
    timestamp: Date;

    @Field()
    count: number;

    @Field()
    amount?: number;

    @Field(() => [String])
    ids?: string[];
}
