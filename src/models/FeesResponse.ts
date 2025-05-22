import { ObjectType, Field } from 'type-graphql';

import { FundTransaction } from '../models';

@ObjectType()
export class ParseCsvResponse {
    @Field()
    status: 'success' | 'error';

    @Field({ nullable: true })
    field?: string;

    @Field({ nullable: true })
    message?: string;
}

@ObjectType()
export class FeesCountResponse {
    @Field()
    count: number;

    @Field()
    sum: number;
}

@ObjectType()
export class FeeResponse {
    @Field()
    timestamp: Date;

    @Field(() => FundTransaction)
    data?: FundTransaction;
}

@ObjectType()
export class FeeIdsResponse {
    @Field()
    timestamp: Date;

    @Field(() => [String])
    ids: string[];

    @Field()
    totalAmount: number;
}

@ObjectType()
export class ProcessFeeResponse {
    @Field(() => Boolean)
    success: boolean;

    @Field(type => String, { nullable: true })
    errorMessage?: string;

    @Field(type => FundTransaction, { nullable: true })
    data?: FundTransaction;
}

@ObjectType()
export class FundsCheckResponse {
    @Field(() => Number)
    count: number;

    @Field(type => Number)
    sum: number;
}
