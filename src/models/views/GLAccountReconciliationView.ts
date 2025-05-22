import { Field, Float, Int, ObjectType } from 'type-graphql';
import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'gl_account_reconciliation_view' })
@ObjectType()
export class GLAccountReconciliationView {
    @ViewColumn()
    @Field()
    id: string;

    @ViewColumn()
    @Field(type => Int, { nullable: false })
    unreconciledCount: number;

    @ViewColumn()
    @Field(type => Float, { nullable: false })
    unreconciledAmount: number;

    @ViewColumn()
    @Field(type => Float, { nullable: false })
    change: number;
}
