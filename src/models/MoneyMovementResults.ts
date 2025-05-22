import { ObjectType, Field } from 'type-graphql';

import { FundTransactionDetail } from './FundTransactionDetail';

@ObjectType()
export class PotentialMoneyMovementResults {
    @Field()
    timestamp: Date;

    @Field()
    count: number;

    @Field()
    totalAmount: number;
}

@ObjectType()
export class MoneyMovementResults {
    @Field()
    timestamp: Date;

    @Field()
    count: number;

    @Field()
    totalAmount: number;

    @Field(() => [FundTransactionDetail])
    data: FundTransactionDetail[];
}
