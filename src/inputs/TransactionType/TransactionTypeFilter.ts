import { InputType, Field } from 'type-graphql';

@InputType()
export class TransactionTypeFilter {
    @Field(type => String, { nullable: true })
    name: string;
}
