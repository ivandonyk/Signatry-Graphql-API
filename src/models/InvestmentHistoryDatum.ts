import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class InvestmentHistoryDatum {
    @Field(() => String, { nullable: false })
    id: string;

    @Field(() => String, { nullable: false })
    name: string;

    @Field(() => Number, { nullable: true })
    value: number;
}
