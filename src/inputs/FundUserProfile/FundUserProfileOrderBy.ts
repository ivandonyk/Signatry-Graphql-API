import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { UserProfileOrderBy } from '../UserProfile/UserProfileOrderBy';

@InputType()
export class FundUserProfileOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => UserProfileOrderBy, { nullable: true })
    userProfile?: UserProfileOrderBy;
}
