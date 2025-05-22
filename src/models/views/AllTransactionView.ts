import { Field, Float, ObjectType } from 'type-graphql';
import { ViewEntity, ViewColumn, PrimaryColumn } from 'typeorm';

/** @todo update source/destination account id/number when available */

@ViewEntity({ name: 'vw_all_transaction', materialized: true })
@ObjectType()
export class AllTransactionView {
    @ViewColumn()
    @Field()
    id: string;

    @ViewColumn()
    @Field(type => String, { nullable: false })
    fundTransactionId: string;

    @ViewColumn()
    @Field(type => Date, { nullable: false })
    transactionDateTime: Date;

    @ViewColumn()
    // Required for typeorm to properly form count queries with "DISTINCT"
    // See https://github.com/typeorm/typeorm/issues/4479
    @PrimaryColumn()
    @Field(type => String, { nullable: false })
    transactionCode: string;

    @ViewColumn()
    @Field(type => Float, { nullable: false })
    amount: number;

    @ViewColumn()
    @Field(type => String, { nullable: false })
    transactionType: string;

    @ViewColumn()
    @Field(type => String, { nullable: false })
    fundId: string;

    @ViewColumn()
    @Field(type => String, { nullable: false })
    fundName: string;

    @ViewColumn()
    @Field(type => String, { nullable: false })
    fundCode: string;

    @ViewColumn()
    @Field(type => String, { nullable: false })
    fundKey: string;

    @ViewColumn()
    @Field(type => String, { nullable: false })
    transactionStatus: string;

    @ViewColumn()
    @Field(type => String)
    statusDesc?: string;

    @ViewColumn()
    @Field(type => String)
    accountingStatus?: string;

    // source account
    @ViewColumn()
    @Field(type => String, { nullable: false })
    sourceAccountTitle: string;

    @ViewColumn()
    @Field(type => String, { nullable: true })
    sourceAccountNumber?: string;

    @ViewColumn()
    @Field(type => String, { nullable: true })
    sourceAccountId?: string;

    // destination account
    @ViewColumn()
    @Field(type => String, { nullable: false })
    destinationAccountTitle: string;

    @ViewColumn()
    @Field(type => String, { nullable: true })
    destinationAccountNumber?: string;

    @ViewColumn()
    @Field(type => String, { nullable: true })
    destinationAccountId?: string;
}
