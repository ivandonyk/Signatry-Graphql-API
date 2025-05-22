import { InputType, Field, ID } from 'type-graphql';
import { ManualTransactionsInput } from './ManualTransactionsInput';

@InputType()
export class AddNewTransactionsToBatchInput {
    @Field(type => ID, { nullable: false })
    batchId: string;

    @Field(type => [ManualTransactionsInput], { nullable: true })
    manualTransactions?: ManualTransactionsInput[];

    @Field(type => [ID], { nullable: true })
    includedTransactionDetailIds?: string[];
}
