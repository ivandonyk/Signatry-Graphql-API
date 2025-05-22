import { InputType, Field } from 'type-graphql';
import { RecipientContactFilter } from '../RecipientContact/RecipientContactFilter';

@InputType()
export class RecipientFilter {
    @Field(type => String, { nullable: true })
    name: string;

    @Field(type => String, { nullable: true })
    ein: string;

    @Field(type => RecipientContactFilter, { nullable: true })
    contact: RecipientContactFilter;
}
