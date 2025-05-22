import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class InvestmentInstruction {
    @Field()
    name: string;

    @Field()
    amount: number;
}
