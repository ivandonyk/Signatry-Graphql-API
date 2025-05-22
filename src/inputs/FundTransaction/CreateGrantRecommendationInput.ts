import { InputType, Field, Float } from 'type-graphql';
import { RecurringGrantInput } from '../Grant/RecurringGrantInput';
import { OneTimeGrantInput } from '../Grant/OneTimeGrantInput';

@InputType()
export class CreateGrantRecommendationInput {
    @Field()
    fundId: string;

    @Field(type => Float)
    amount: number;

    @Field({ nullable: true })
    purposeCategory: string;

    @Field({ nullable: true })
    purposeNotes: string;

    @Field({ nullable: true })
    specialInstructions: string;

    @Field({ nullable: true })
    specialRecognition: string;

    @Field()
    includeFundNameInRecognition: boolean;

    // Whether the grant is in the name of an Account Holder other than the fund creator
    @Field({ nullable: true })
    grantOnBehalfOfDonorUserProfileId?: string;

    @Field()
    includeDonorNameInRecognition: boolean;

    @Field()
    includeDonorAddressInRecognition: boolean;

    @Field(type => RecurringGrantInput, { nullable: true })
    recurringTiming: RecurringGrantInput;

    @Field(type => OneTimeGrantInput, { nullable: true })
    oneTimeGrantTiming: OneTimeGrantInput;

    @Field(type => String, { nullable: true })
    originalFundTransactionId: string;

    @Field(type => String, { nullable: true })
    parentRecurrenceId?: string;

    @Field(type => Date, { nullable: true })
    scheduledDate?: Date;

    @Field(type => String, { nullable: true })
    recipientName?: string;

    @Field(type => String, { nullable: true })
    recipientNotes?: string;
}
