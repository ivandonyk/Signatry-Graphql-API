import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { GLAccountOrderBy } from '../GLAccount/GLAccountOrderBy';

@InputType()
export class BatchOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    amount?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    status?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    batchCode?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    id?: OrderBy;

    @Field(type => GLAccountOrderBy, { nullable: true })
    sourceGLAccount?: GLAccountOrderBy;

    @Field(type => GLAccountOrderBy, { nullable: true })
    destinationGLAccount?: GLAccountOrderBy;

    @Field(type => OrderBy, { nullable: true })
    transactions?: OrderBy;
}
