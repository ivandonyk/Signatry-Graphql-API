import { InputType, Field } from 'type-graphql';

@InputType()
export class TransactionStatusFilter {
    @Field(type => String, { nullable: true })
    name: string;
}
