import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { RecipientContactOrderBy } from '../RecipientContact/RecipientContactOrderBy';
import { RecipientStatusOrderBy } from './RecipientStatusOrderBy';

@InputType()
export class RecipientOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    paymentType?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    ein?: OrderBy;

    @Field(type => RecipientStatusOrderBy, { nullable: true })
    recipientStatus: RecipientStatusOrderBy;

    @Field(type => RecipientContactOrderBy, { nullable: true })
    contact: RecipientContactOrderBy;
}
