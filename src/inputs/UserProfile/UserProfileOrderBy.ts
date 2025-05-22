import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class UserProfileOrderBy {
    @Field(type => OrderBy, { nullable: true })
    id?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    firstName?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    middleName?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    lastName?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    stripeCustomerId?: OrderBy;
}
