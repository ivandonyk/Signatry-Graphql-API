import { OrderBy } from '../inputs/core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class PayoutOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    amount?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    status?: OrderBy;
}
