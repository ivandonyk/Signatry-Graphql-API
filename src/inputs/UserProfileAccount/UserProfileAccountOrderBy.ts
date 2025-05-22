import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class UserProfileAccountOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    accessToken?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    accountId?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    institutionId?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    itemId?: OrderBy;
}
