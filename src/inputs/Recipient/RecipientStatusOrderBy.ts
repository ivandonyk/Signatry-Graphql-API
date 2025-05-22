import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class RecipientStatusOrderBy {
    @Field(type => OrderBy, { nullable: true })
    id?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    ordinal?: OrderBy;
}
