import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { RecipientContactAddressOrderBy } from '../RecipientContactAddress/RecipientContactAddressOrderBy';

@InputType()
export class RecipientContactOrderBy {
    @Field(type => OrderBy, { nullable: true })
    id?: OrderBy;

    @Field(type => RecipientContactAddressOrderBy, { nullable: true })
    primaryAddress: RecipientContactAddressOrderBy;

    // left this in case something is already using or needs to use in future
    @Field(type => RecipientContactAddressOrderBy, { nullable: true })
    address: RecipientContactAddressOrderBy;
}
