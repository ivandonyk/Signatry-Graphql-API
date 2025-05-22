import { InputType, Field, Int } from 'type-graphql';
import { DetailPaymentType } from '../../models/FundTransactionDetail';

@InputType()
export class FundTransactionPaymentDetails {
    @Field(type => DetailPaymentType, { nullable: false })
    paymentType: DetailPaymentType;
    @Field(type => String, { nullable: true })
    paymentNumber?: string;
    @Field(type => String, { nullable: true })
    securityId?: string;
    @Field(type => String, { nullable: true })
    securityName?: string;
    @Field(type => String, { nullable: true })
    tickerSymbol?: string;
    @Field(type => Int, { nullable: true })
    units?: number;
    @Field(type => String, { nullable: true })
    value?: string;
    @Field(type => String, { nullable: true })
    fees?: string;
}
