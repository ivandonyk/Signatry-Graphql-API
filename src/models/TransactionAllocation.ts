import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class TransactionAllocation {
    @Field()
    name: string;

    @Field()
    amount: number;
}
