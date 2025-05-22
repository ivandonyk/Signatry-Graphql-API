import { InputType, Field } from 'type-graphql';
@InputType()
export class RecipientPreferredPaymentMetaAddressInput {
    @Field()
    address1: string;

    @Field(type => String, { nullable: true })
    address2: string;

    @Field()
    city: string;

    @Field()
    state: string;

    @Field()
    zip: string;
}

@InputType()
export class CreateRecipientPreferredPaymentInput {
    @Field(type => String, { nullable: false })
    recipientId: string;

    @Field(type => String, { nullable: true })
    achBankName: string;

    @Field(type => String, { nullable: true })
    achAccountNumber: string;

    @Field(type => String, { nullable: true })
    achRoutingNumber: string;

    @Field(type => String, { nullable: true })
    achBeneficiaryName: string;

    @Field(type => String, { nullable: true })
    paymentType: string;

    @Field(type => String, { nullable: true })
    wireBankName: string;

    @Field(type => String, { nullable: true })
    wireAccountNumber: string;

    @Field(type => String, { nullable: true })
    wireNumber: string;

    @Field(type => String, { nullable: true })
    wireBeneficiaryName: string;

    @Field(type => RecipientPreferredPaymentMetaAddressInput, { nullable: true })
    bankAddress: RecipientPreferredPaymentMetaAddressInput;

    @Field(type => String, { nullable: true })
    address: string;
}
