import { InputType, Field, ID } from 'type-graphql';
import { mapValues } from 'lodash';
import { NumberFilter } from '../inputs/core/NumberFilter';
import { DateFilter } from '../inputs/core/DateFilter';
import { StringFilter } from '../inputs/core/StringFilter';

@InputType()
export class PayoutFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => Number, { nullable: true })
    version: number;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => String, { nullable: true })
    statementCode?: StringFilter;

    @Field(type => String, { nullable: true })
    status?: StringFilter;

    @Field(type => NumberFilter, { nullable: true })
    amount?: NumberFilter;

    createFindOperator(): any {
        return mapValues(this, (value, key) =>
            typeof value === 'object' ? (<any>value).createFindOperator() : value
        );
    }
}
