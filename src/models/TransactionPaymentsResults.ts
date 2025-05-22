import { ObjectType, Field } from 'type-graphql';
import { TransactionPayment } from '.';

@ObjectType()
export class TransactionPaymentResults {
    @Field()
    timestamp: Date;

    @Field(() => [TransactionPayment])
    data?: TransactionPayment[];

    @Field()
    count: number;

    @Field()
    totalAmount?: number;
}
