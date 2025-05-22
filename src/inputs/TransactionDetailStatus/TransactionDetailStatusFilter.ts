import { InputType, Field } from 'type-graphql';

@InputType()
export class TransactionDetailStatusFilter {
    @Field(type => String)
    name: string;
}
