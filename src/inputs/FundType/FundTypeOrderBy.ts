import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class FundTypeOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    description?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    orderNum?: OrderBy;
}
