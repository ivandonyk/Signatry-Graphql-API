import { InputType, Field, ID } from 'type-graphql';
import { mapValues } from 'lodash';
import { NumberFilter } from '../core/NumberFilter';
import { DateFilter } from '../core/DateFilter';
import { TransactionTypeFilter } from '../TransactionType/TransactionTypeFilter';
import { TransactionDetailFilter } from '../FundTransactionDetail/FundTransactionDetailFilter';
import { TransactionSourceFilter } from '../FundTransactionSource/FundTransactionSourceFilter';
import { TransactionStatusFilter } from '../TransactionStatus/TransactionStatusFilter';
import { TransactionInfoFilter } from '../TransactionInfo/TransactionInfoFilter';
import { FundFilter } from '../Fund/FundFilter';
import { UserProfileFilter } from '../UserProfile/UserProfileFilter';

@InputType()
export class FundTransactionFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => Number, { nullable: true })
    version: number;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => String, { nullable: true })
    lessThan?: string;

    @Field(type => String, { nullable: true })
    createdBy?: string;

    @Field(type => DateFilter, { nullable: true })
    transactionDateTime?: DateFilter;

    @Field(type => NumberFilter, { nullable: true })
    amount: NumberFilter;

    @Field(type => NumberFilter, { nullable: true })
    units: NumberFilter;

    @Field(type => String, { nullable: true })
    divestmentStatus: string;

    @Field(type => String, { nullable: true })
    transferStatus: string;

    @Field(type => String, { nullable: true })
    grantPaymentStatus: string;

    @Field(type => UserProfileFilter, { nullable: true })
    userProfile: UserProfileFilter;

    @Field(type => TransactionTypeFilter, { nullable: true })
    transactionType: TransactionTypeFilter;

    @Field(type => TransactionDetailFilter, { nullable: true })
    transactionDetails: TransactionDetailFilter;

    @Field(type => TransactionInfoFilter, { nullable: true })
    transactionInfo: TransactionInfoFilter;

    @Field(type => TransactionSourceFilter, { nullable: true })
    fundTransactionSource: TransactionSourceFilter;

    @Field(type => TransactionStatusFilter, { nullable: true })
    transactionStatus: TransactionStatusFilter;

    @Field(type => FundFilter, { nullable: true })
    fund: FundFilter;

    createFindOperator(): any {
        return mapValues(this, (value, key) =>
            typeof value === 'object' ? (<any>value).createFindOperator() : value
        );
    }
}
