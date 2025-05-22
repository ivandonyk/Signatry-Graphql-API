import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class FundContactAddressOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    lineOne?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    lineTwo?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    city?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    state?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    postalCode?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    country?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    isPrimary?: OrderBy;
}
