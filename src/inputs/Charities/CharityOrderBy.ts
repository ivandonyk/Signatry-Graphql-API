import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class CharityOrderBy {
    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    relevance?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    popular?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    new?: OrderBy;
}
