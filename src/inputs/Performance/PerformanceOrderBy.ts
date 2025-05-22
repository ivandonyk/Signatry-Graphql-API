import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class PerformanceOrderBy {
    @Field(type => OrderBy, { nullable: true })
    date?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    beginningBalance?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    endingBalance?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    delta?: OrderBy;
}
