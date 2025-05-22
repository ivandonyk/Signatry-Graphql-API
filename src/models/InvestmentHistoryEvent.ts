import { ObjectType, Field } from 'type-graphql';
import { InvestmentHistoryDatum } from './InvestmentHistoryDatum';

@ObjectType()
export class InvestmentHistoryEvent {
    @Field()
    date: string;

    @Field(() => [InvestmentHistoryDatum])
    values: InvestmentHistoryDatum[];
}
