import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { RecipientOrderBy } from '../Recipient/RecipientOrderBy';

@InputType()
export class TransactionInfoOrderBy {
    @Field(type => OrderBy, { nullable: true })
    purposeNotes?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    requestedProcessDate?: OrderBy;

    @Field(type => RecipientOrderBy, { nullable: true })
    recipient: RecipientOrderBy;
}
