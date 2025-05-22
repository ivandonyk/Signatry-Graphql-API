import { InputType, Field, Float } from 'type-graphql';
import { OneTimeGrantInput } from '../Grant/OneTimeGrantInput';
import { RecurringGrantInput } from '../Grant/RecurringGrantInput';
import { FundTransactionPaymentDetails } from './FundTransactionPaymentDetails';

@InputType()
export class CreateFundContributionInput {
    @Field()
    fundId: string;

    @Field(type => String, { nullable: true })
    userProfileAccountId: string;

    @Field(type => String, { nullable: true })
    contributeOnBehalfOfDonorUserProfileId?: string;

    @Field(type => Float)
    amount: number;

    @Field(type => RecurringGrantInput, { nullable: true })
    recurringTiming: RecurringGrantInput;

    @Field(type => OneTimeGrantInput, { nullable: true })
    oneTimeGrantTiming: OneTimeGrantInput;

    @Field(type => String, { nullable: true })
    originalFundTransactionId: string;

    @Field(type => FundTransactionPaymentDetails, { nullable: true })
    paymentDetails?: FundTransactionPaymentDetails;

    @Field(type => String, { nullable: true })
    parentRecurrenceId?: string;

    @Field(type => Date || String, { nullable: true })
    scheduledDate?: Date | string;
}
