import { ObjectType, Field } from 'type-graphql';

import { Security, FundTransaction, InstitutionAccountTransaction } from '.';

@ObjectType()
export class FundTransactionResults {
    @Field()
    timestamp: Date;

    @Field(() => [FundTransaction])
    data?: FundTransaction[];

    @Field()
    count: number;

    @Field()
    totalCount?: number;

    @Field()
    totalAmount?: number;

    @Field()
    selectableCount?: number;

    @Field()
    selectableAmount?: number;
}

@ObjectType()
export class PaymentInformationResults {
    @Field()
    timestamp: Date;

    @Field(() => FundTransaction)
    fundTransaction: FundTransaction;

    @Field(() => Security, { nullable: true })
    security?: Security;

    @Field(() => InstitutionAccountTransaction, { nullable: true })
    transaction?: InstitutionAccountTransaction;
}
