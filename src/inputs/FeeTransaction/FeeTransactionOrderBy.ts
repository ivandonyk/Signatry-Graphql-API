import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class FeeTransactionOrderBy {
    @Field(type => OrderBy, { nullable: true })
    amount?: OrderBy;
}
