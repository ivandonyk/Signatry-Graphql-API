import { ObjectType, Field, Int, Float } from 'type-graphql';
@ObjectType()
export class RecipientPreferredPaymentMetaBase {
    @Field(type => String, { nullable: true })
    bankName: string;

    @Field(type => String, { nullable: true })
    accountNumber: string;

    @Field(type => String, { nullable: true })
    beneficiaryName: string;
}
@ObjectType()
export class RecipientPreferredPaymentMetaACH extends RecipientPreferredPaymentMetaBase {
    @Field(type => String, { nullable: true })
    routingNumber: string;
}

@ObjectType()
export class RecipientPreferredPaymentMetaAddress {
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

@ObjectType()
export class RecipientPreferredPaymentMetaWire extends RecipientPreferredPaymentMetaBase {
    @Field(type => String, { nullable: true })
    wireNumber: string;
    @Field(type => RecipientPreferredPaymentMetaAddress, { nullable: true })
    bankAddress: RecipientPreferredPaymentMetaAddress;
}

@ObjectType()
export class RecipientPreferredPaymentMetaCheck {
    @Field(type => String, { nullable: true })
    address: string;
}
@ObjectType()
export class RecipientPreferredPaymentMeta {
    @Field(type => RecipientPreferredPaymentMetaACH, { nullable: true })
    achMetadata: RecipientPreferredPaymentMetaACH;
    @Field(type => RecipientPreferredPaymentMetaWire, { nullable: true })
    wireMetadata: RecipientPreferredPaymentMetaWire;
    @Field(type => RecipientPreferredPaymentMetaCheck, { nullable: true })
    checkMetadata: RecipientPreferredPaymentMetaCheck;
}
