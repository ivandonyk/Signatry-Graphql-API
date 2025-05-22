import { InputType, Field, ID } from 'type-graphql';
import { mapValues } from 'lodash';
import { DateFilter } from '../core/DateFilter';

@InputType()
export class PendingFundUserFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => ID, { nullable: true })
    email?: string;

    @Field(type => ID, { nullable: true })
    fundId?: string;
}
