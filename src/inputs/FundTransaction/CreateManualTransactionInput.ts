import { InputType, Field, Float } from 'type-graphql';

import { TransactionDetailTypeName } from '../../models/TransactionDetailType';
import { TransactionMetadata, TransferMetadata } from '../../models/FundTransactionMetadata';
import { TransactionStatus, Fund, TransactionType } from '../../models';
import { FundTransactionPaymentDetails } from './FundTransactionPaymentDetails';

@InputType()
export class CreateManualTransactionInput {
    // accept either Fund model or fundId
    @Field()
    fundId?: string;
    @Field(type => Fund)
    fund?: Fund;

    // accept either TransactionType model or transaction type enum
    @Field(type => TransactionType)
    transactionTypeModel?: TransactionType;
    @Field(type => String)
    transactionType?: string;

    @Field(type => Float)
    amount: number;

    @Field(type => String)
    description?: string;

    @Field(type => TransactionDetailTypeName)
    transactionDetailType?: TransactionDetailTypeName;

    @Field(type => String)
    metadata?: TransferMetadata | TransactionMetadata;

    @Field(type => String)
    transactionDateTime?: string;

    @Field(type => TransactionStatus)
    transactionStatus?: TransactionStatus;

    @Field(type => FundTransactionPaymentDetails, { nullable: true })
    paymentDetails?: FundTransactionPaymentDetails;

    @Field(type => String)
    date: string;
}
