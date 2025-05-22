import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class FundTransactionCommentOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;
}
