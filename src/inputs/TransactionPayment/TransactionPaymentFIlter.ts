import { InputType, Field } from 'type-graphql';
import { DetailPaymentType } from '../../models/FundTransactionDetail';

@InputType()
export class TransactionPaymentFilter {
    @Field(type => String, { nullable: true })
    createdOn?: string;

    @Field(type => String, { nullable: true })
    updatedOn?: string;

    @Field(type => String, { nullable: true })
    amount?: string;

    @Field(type => String, { nullable: true })
    id?: string;

    @Field(type => String, { nullable: true })
    scheduledDate?: string;

    @Field(type => DetailPaymentType, { nullable: true })
    paymentType: DetailPaymentType;
}
