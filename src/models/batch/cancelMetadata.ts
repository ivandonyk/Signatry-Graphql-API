import { ObjectType, Field, Float } from 'type-graphql';

import { DetailPaymentType } from '../FundTransactionDetail';

// just pick off the properties we need

@ObjectType()
class _UserProfile {
    @Field(type => String)
    fullName: string;
}

@ObjectType()
class _Fund {
    @Field(type => String)
    id: string;
    @Field(type => String)
    fundCode: string;
    @Field(type => String)
    name: string;
}

@ObjectType()
class _TransactionType {
    @Field(type => String)
    name: string;
}

@ObjectType()
class _PaymentDetails {
    @Field(type => DetailPaymentType, { nullable: true })
    paymentType?: DetailPaymentType;
}

@ObjectType()
class _Metadata {
    @Field(type => _PaymentDetails, { nullable: true })
    paymentDetails?: _PaymentDetails;
}

@ObjectType()
class _FundTransaction {
    @Field(type => String, { nullable: true })
    id: string;

    @Field(type => _UserProfile)
    createdByProfile: _UserProfile;

    @Field(type => _Fund)
    fund: _Fund;

    @Field(type => String, { nullable: true })
    transactionCode: string;

    @Field(type => _TransactionType)
    transactionType: _TransactionType;

    @Field(type => _Metadata, { nullable: true })
    metadata?: _Metadata;
}

@ObjectType()
export class BatchCancelMetadata {
    @Field(type => String)
    id: string;

    // this gets coerced into a string when plopped into JSONB
    @Field(type => String)
    createdOn: string;

    @Field(type => Float)
    amount: number;

    @Field(type => _FundTransaction)
    fundTransaction: _FundTransaction;
}
