import { InputType, Field, Int, Float, ID } from 'type-graphql';
import { Raw } from 'typeorm';
import { mapValues } from 'lodash';
import { NumberFilter } from '../core/NumberFilter';
import { DateFilter } from '../core/DateFilter';
import { StringFilter } from '../core/StringFilter';

@InputType()
export class InvestmentFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => Boolean, { nullable: true })
    enabled: boolean;

    @Field(type => StringFilter, { nullable: true })
    name: StringFilter;

    @Field(type => StringFilter, { nullable: true })
    description: StringFilter;

    @Field(type => NumberFilter, { nullable: true })
    defaultAllocationPercentage: NumberFilter;

    @Field(type => NumberFilter, { nullable: true })
    closePrice: NumberFilter;

    @Field(type => DateFilter, { nullable: true })
    closePriceAsOf: DateFilter;

    @Field(type => StringFilter, { nullable: true })
    tickerSymbol: StringFilter;

    @Field(type => NumberFilter, { nullable: true })
    orderNum: NumberFilter;

    createFindOperator(): any {
        return mapValues(this, (value, key) =>
            typeof value === 'object' ? (<any>value).createFindOperator() : value
        );
    }
}
