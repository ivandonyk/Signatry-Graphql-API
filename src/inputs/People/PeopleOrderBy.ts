import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class PeopleOrderBy {
    @Field(type => OrderBy, { nullable: true })
    firstName?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    email?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    role?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;
}
