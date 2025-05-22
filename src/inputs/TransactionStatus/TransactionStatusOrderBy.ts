import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class TransactionStatusOrderBy {
    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;
}
