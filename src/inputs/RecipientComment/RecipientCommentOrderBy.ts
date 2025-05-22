import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class RecipientCommentOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;
}
