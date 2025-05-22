import { InputType, Field, ID } from 'type-graphql';
import { mapValues } from 'lodash';
import { DateFilter } from '../core/DateFilter';

@InputType()
export class FundUserProfileFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => ID, { nullable: true })
    userProfileId?: string;

    @Field(type => ID, { nullable: true })
    fundId?: string;
}
