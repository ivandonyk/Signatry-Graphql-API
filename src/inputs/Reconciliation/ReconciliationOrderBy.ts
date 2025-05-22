import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { GLAccountOrderBy } from '../GLAccount/GLAccountOrderBy';

@InputType()
export class ReconciliationOrderBy {
    @Field(type => OrderBy, { nullable: true })
    datePreviousReconciled?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    unreconciledCount?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    change?: OrderBy;

    @Field(type => GLAccountOrderBy, { nullable: true })
    glAccount?: GLAccountOrderBy;
}
