import { InputType, Field, Float } from 'type-graphql';

import { DetailPaymentType } from '../../models/FundTransactionDetail';

@InputType()
export class ManualTransactionsInput {
    @Field(type => String, { nullable: true })
    paymentNumber: string;

    @Field(type => String, { nullable: true })
    date: string;

    @Field(type => String, { nullable: false })
    description: string;

    @Field(type => String, { nullable: false })
    amount: string;

    @Field(type => String, { nullable: true })
    donorId?: string;

    @Field(type => String, { nullable: true })
    fundId: string;

    @Field(type => String, { nullable: false })
    transactionType: string;

    @Field(type => DetailPaymentType, { nullable: false })
    paymentType: DetailPaymentType;

    @Field(type => String, { nullable: true })
    securityId?: string;

    @Field(type => String, { nullable: true })
    securityName?: string;

    @Field(type => String, { nullable: true })
    tickerSymbol?: string;

    @Field(type => String, { nullable: true })
    value?: string;

    @Field(type => Float, { nullable: true })
    quantity?: number;

    @Field(type => String, { nullable: true })
    fees?: string;
}
