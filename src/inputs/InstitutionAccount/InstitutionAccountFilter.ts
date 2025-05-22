import { InputType, Field, Int, Float, ID } from 'type-graphql';
import { Raw } from 'typeorm';
import { mapValues } from 'lodash';
import { NumberFilter } from '../core/NumberFilter';
import { DateFilter } from '../core/DateFilter';
import { StringFilter } from '../core/StringFilter';

@InputType()
export class InstitutionAccountFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => StringFilter, { nullable: true })
    accountId?: StringFilter;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => Boolean, { nullable: true })
    enabled: boolean;

    @Field(type => StringFilter, { nullable: true })
    name: StringFilter;

    createFindOperator(): any {
        return mapValues(this, (value, key) =>
            typeof value === 'object' ? (<any>value).createFindOperator() : value
        );
    }
}
