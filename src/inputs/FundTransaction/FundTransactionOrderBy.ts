import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { TransactionTypeOrderBy } from '../TransactionType/TransactionTypeOrderBy';
import { TransactionStatusOrderBy } from '../TransactionStatus/TransactionStatusOrderBy';
import { TransactionInfoOrderBy } from '../TransactionInfo/TransactionInfoOrderBy';
import { FeeTransactionOrderBy } from '../FeeTransaction/FeeTransactionOrderBy';
import { TransactionRecurrenceOrderBy } from '../TransactionRecurrence/TransactionRecurrenceOrderBy';
import { FundOrderBy } from '../Fund/FundOrderBy';
import { UserProfileOrderBy } from '../UserProfile/UserProfileOrderBy';

@InputType()
export class FundTransactionOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    chargedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    paidOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    amount?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    units?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    transactionCode?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    grantPaymentStatus?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    divestmentStatus?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    specialApproval?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    scheduledDate?: OrderBy;

    @Field(type => TransactionTypeOrderBy, { nullable: true })
    transactionType: TransactionTypeOrderBy;

    @Field(type => TransactionInfoOrderBy, { nullable: true })
    transactionInfo: TransactionInfoOrderBy;

    @Field(type => TransactionStatusOrderBy, { nullable: true })
    transactionStatus: TransactionStatusOrderBy;

    @Field(type => FundOrderBy, { nullable: true })
    fund: FundOrderBy;

    @Field(type => UserProfileOrderBy, { nullable: true })
    userProfile: UserProfileOrderBy;

    @Field(type => UserProfileOrderBy, { nullable: true })
    createdByProfile: UserProfileOrderBy;

    @Field(type => FeeTransactionOrderBy, { nullable: true })
    feeTransaction: FeeTransactionOrderBy;

    @Field(type => TransactionRecurrenceOrderBy, { nullable: true })
    transactionRecurrence: TransactionRecurrenceOrderBy;

    @Field(type => OrderBy, { nullable: true })
    transactionDateTime?: OrderBy;
}
