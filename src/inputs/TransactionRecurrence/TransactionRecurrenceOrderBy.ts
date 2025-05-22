import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class TransactionRecurrenceOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    id?: OrderBy;
}
