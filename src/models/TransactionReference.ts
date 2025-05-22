import { ObjectType, Field, Float } from 'type-graphql';
import { RecurringGrantInput } from '../inputs/Grant/RecurringGrantInput';
import { OneTimeGrantInput } from '../inputs/Grant/OneTimeGrantInput';

@ObjectType()
export class TransactionReference {
    @Field()
    fundId: string;

    @Field()
    userProfileAccountId: string;

    @Field(type => String, { nullable: true })
    contributeOnBehalfOfDonorUserProfileId: string;

    @Field(type => Float)
    amount: number;

    @Field(type => String, { nullable: true })
    originalFundTransactionId: string;

    @Field({ nullable: true })
    purposeCategory: string;

    @Field({ nullable: true })
    purposeNotes: string;

    @Field({ nullable: true })
    specialInstructions: string;

    @Field({ nullable: true })
    specialRecognition: string;

    @Field({ nullable: true })
    includeFundNameInRecognition: boolean;

    // Whether the grant is in the name of an Account Holder other than the fund creator
    @Field({ nullable: true })
    grantOnBehalfOfDonorUserProfileId?: string;

    @Field({ nullable: true })
    includeDonorNameInRecognition: boolean;

    @Field({ nullable: true })
    includeDonorAddressInRecognition: boolean;
}
