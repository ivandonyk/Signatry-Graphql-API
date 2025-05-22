import { InputType, Field, Float } from 'type-graphql';
import { RecurringGrantInput } from '../Grant/RecurringGrantInput';
import { OneTimeGrantInput } from '../Grant/OneTimeGrantInput';
import { DetailPaymentType } from '../../models/FundTransactionDetail';

@InputType()
export class EditGrantRecommendationInput {
    @Field({ nullable: true })
    fundId: string;

    @Field(type => Float, { nullable: true })
    amount: number;

    @Field({ nullable: true })
    purposeCategory: string;

    @Field({ nullable: true })
    recipientId: string;

    @Field({ nullable: true })
    purposeNotes: string;

    @Field({ nullable: true })
    specialInstructions: string;

    @Field({ nullable: true })
    specialRecognition: string;

    @Field({ nullable: true })
    includeFundNameInRecognition: boolean;

    @Field({ nullable: true })
    includeDonorNameInRecognition: boolean;

    @Field({ nullable: true })
    includeDonorAddressInRecognition: boolean;

    @Field(type => String, { nullable: true })
    payBy: string;

    @Field(type => DetailPaymentType, { nullable: true })
    paymentType: DetailPaymentType;
}
