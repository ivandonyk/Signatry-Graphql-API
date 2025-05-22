import { InputType, Field } from 'type-graphql';

@InputType()
export class TransactionSourceFilter {
    @Field(type => String, { nullable: true })
    status: string;
}
