import { ObjectType, Field } from 'type-graphql';

@ObjectType()
export class UnitPriceHistoryDatum {
    @Field(() => String, { nullable: false })
    id: string;

    @Field(() => String, { nullable: false })
    name: string;

    @Field(() => Number, { nullable: true })
    value: number;
}
