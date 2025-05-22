import { InputType, Field, Int, Float, ID } from 'type-graphql';
import { RecipientFilter } from '../Recipient/RecipientFilter';

@InputType()
export class TransactionInfoFilter {
    @Field(type => RecipientFilter, { nullable: true })
    recipient: RecipientFilter;

    @Field(type => String, { nullable: true })
    purposeNotes: string;
}
