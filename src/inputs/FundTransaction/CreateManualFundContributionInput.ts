import { InputType, Field, Float } from 'type-graphql';
import { OneTimeGrantInput } from '../Grant/OneTimeGrantInput';
import { RecurringGrantInput } from '../Grant/RecurringGrantInput';
import { CreateFundContributionInput } from './CreateFundContributionInput';
import { FundTransactionPaymentDetails } from './FundTransactionPaymentDetails';

@InputType()
export class CreateManualFundContributionInput extends CreateFundContributionInput {
    @Field(type => String, { nullable: false })
    date: string;
}
