import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

import { UserProfileOrderBy } from '../UserProfile/UserProfileOrderBy';
import { FundUserProfileOrderBy } from '../FundUserProfile/FundUserProfileOrderBy';

@InputType()
export class FundOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    fundCode?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    fundKey?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    description?: OrderBy;

    @Field(type => UserProfileOrderBy, { nullable: true })
    createdByUserProfile: UserProfileOrderBy;

    @Field(type => FundUserProfileOrderBy, { nullable: true })
    fundUserProfile: FundUserProfileOrderBy;

    @Field(type => OrderBy, { nullable: true })
    investedBalance?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    pendingBalance?: OrderBy;
}
