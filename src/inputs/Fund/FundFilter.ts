import { InputType, Field, Int, Float, ID } from 'type-graphql';
import { mapValues } from 'lodash';
import { DateFilter } from '../core/DateFilter';
import { FundUserProfileFilter } from '../FundUserProfile/FundUserProfileFilter';
import { UserProfileFilter } from '../UserProfile/UserProfileFilter';
import { FundTypeFilter } from '../FundType/FundTypeFilter';

@InputType()
export class FundFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => String, { nullable: true })
    fundCode: string;

    @Field(type => String, { nullable: true })
    name: string;

    @Field(type => String, { nullable: true })
    description: string;

    @Field(type => Boolean, { nullable: true })
    statementByMail: boolean;

    @Field(type => Boolean, { nullable: true })
    statementByPaperless: boolean;

    @Field(type => Boolean, { nullable: true })
    enabled: boolean;

    @Field(type => ID, { nullable: true })
    fundTypeId: string;

    @Field(type => ID, { nullable: true })
    createdByUserProfileId: string;

    @Field(type => FundUserProfileFilter, { nullable: true })
    fundUserProfiles: FundUserProfileFilter;

    @Field(type => UserProfileFilter, { nullable: true })
    userProfiles: UserProfileFilter;

    @Field(type => FundTypeFilter, { nullable: true })
    fundType: FundTypeFilter;
}
