import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { FundInvestmentOrderBy } from '../FundInvestment/FundInvestmentOrderBy';
import { FundTransactionOrderBy } from '../FundTransaction/FundTransactionOrderBy';
import { GLAccountOrderBy } from '../GLAccount/GLAccountOrderBy';
import { TransactionTypeOrderBy } from '../TransactionType/TransactionTypeOrderBy';
import { BatchOrderBy } from '../Batch/BatchOrderBy';

@InputType()
export class FundTransactionDetailOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    amount?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    units?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    transactionCode?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    type?: OrderBy;

    @Field(type => FundTransactionOrderBy, { nullable: true })
    fundTransaction: FundTransactionOrderBy;

    @Field(type => FundInvestmentOrderBy, { nullable: true })
    fundInvestment: FundInvestmentOrderBy;

    @Field(type => GLAccountOrderBy, { nullable: true })
    sourceAccount: GLAccountOrderBy;

    @Field(type => GLAccountOrderBy, { nullable: true })
    destinationAccount: GLAccountOrderBy;

    @Field(type => TransactionTypeOrderBy, { nullable: true })
    transactionDetailType: TransactionTypeOrderBy;

    @Field(type => TransactionTypeOrderBy, { nullable: true })
    transactionDetailStatus: TransactionTypeOrderBy;

    @Field(type => BatchOrderBy, { nullable: true })
    batch: BatchOrderBy;
}
