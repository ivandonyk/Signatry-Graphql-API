import { InputType, Field, ID } from 'type-graphql';
import { mapValues } from 'lodash';
import { DateFilter } from '../core/DateFilter';
import { FundFilter } from '../Fund/FundFilter';
import { UserProfileEmailFilter } from './UserProfileEmailFilter';

@InputType()
export class UserProfileFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => String, { nullable: true })
    firstName?: string;

    @Field(type => String, { nullable: true })
    middleName?: string;

    @Field(type => String, { nullable: true })
    lastName?: string;

    @Field(type => UserProfileEmailFilter, { nullable: true })
    email?: UserProfileEmailFilter;

    @Field(type => String, { nullable: true })
    stripeCustomerId?: string;

    @Field(type => FundFilter, { nullable: true })
    funds?: FundFilter;
}
