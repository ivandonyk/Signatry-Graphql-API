import { InputType, Field, Int, Float, ID } from 'type-graphql';
import { Raw } from 'typeorm';
import { mapValues } from 'lodash';
import { NumberFilter } from '../core/NumberFilter';
import { DateFilter } from '../core/DateFilter';
import { StringFilter } from '../core/StringFilter';

@InputType()
export class FundTypeFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => StringFilter, { nullable: true })
    name: StringFilter;

    @Field(type => StringFilter, { nullable: true })
    description: StringFilter;

    @Field(type => NumberFilter, { nullable: true })
    orderNum: NumberFilter;

    @Field(type => Boolean, { nullable: true })
    enabled: boolean;

    createFindOperator(): any {
        return mapValues(this, (value, key) =>
            typeof value === 'object' ? (<any>value).createFindOperator() : value
        );
    }
}
