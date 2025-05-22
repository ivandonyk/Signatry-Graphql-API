import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class TransactionTypeOrderBy {
    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;
}
