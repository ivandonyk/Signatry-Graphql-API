import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class RecipientContactAddressOrderBy {
    @Field(type => OrderBy, { nullable: true })
    city?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    state?: OrderBy;
}
