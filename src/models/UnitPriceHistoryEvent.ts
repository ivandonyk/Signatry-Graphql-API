import { ObjectType, Field } from 'type-graphql';
import { UnitPriceHistoryDatum } from './UnitPriceHistoryDatum';

@ObjectType()
export class UnitPriceHistoryEvent {
    @Field()
    date: string;

    @Field(() => [UnitPriceHistoryDatum])
    values: UnitPriceHistoryDatum[];
}
