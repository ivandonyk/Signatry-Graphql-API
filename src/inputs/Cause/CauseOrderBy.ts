import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class CauseOrderBy {
    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    code?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    primaryCode?: OrderBy;
}
