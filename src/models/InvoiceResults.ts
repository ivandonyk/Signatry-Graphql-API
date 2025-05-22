import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class InvoiceResults {
    @Field()
    batchCode: string;

    @Field()
    amount: number;

    @Field()
    sourceAccountName: string;

    @Field()
    sourceAccountNumber: string;

    @Field()
    destinationAccountName: string;

    @Field()
    destinationAccountNumber: string;

    @Field()
    destinationRoutingNumber: string;

    @Field()
    destinationBankAddressLine1: string;
    @Field()
    destinationBankAddressLine2: string;
    @Field()
    destinationBankAddressCity: string;
    @Field()
    destinationBankAddressZip: string;
    @Field()
    destinationBankAddressState: string;

    @Field()
    tenantName: string;
    @Field()
    tenantEmail: string;
    @Field()
    tenantPhone: string;
    @Field()
    tenantAddressLineOne: string;
    @Field()
    tenantCityStateZip: string;

    @Field()
    isIMA: boolean;
}
