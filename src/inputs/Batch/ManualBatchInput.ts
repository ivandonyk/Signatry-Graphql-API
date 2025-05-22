import { InputType, Field, ID } from 'type-graphql';
import { ManualTransactionsInput } from './ManualTransactionsInput';
import { BatchPaymentTypeValue } from '../../models/Batch';
import { registerEnumType } from 'type-graphql';
registerEnumType(BatchPaymentTypeValue, {
    name: 'BatchPaymentTypeValue'
});

@InputType()
export class ManualBatchInput {
    @Field(type => String, { nullable: true })
    sourceAccount: string;

    @Field(type => [ManualTransactionsInput], { nullable: true })
    manualTransactions: ManualTransactionsInput[];

    @Field(type => String, { nullable: true })
    destinationAccount: string;

    @Field(type => [ID], { nullable: false })
    includedTransactionDetailIds: string[];

    @Field(type => String, { nullable: true })
    paymentNumber: string;

    @Field(type => String, { nullable: true })
    reconciliationLineItemDate?: string;

    @Field(type => BatchPaymentTypeValue, { nullable: true })
    paymentType?: BatchPaymentTypeValue;
}
