import { InputType, Field, ID } from 'type-graphql';
import { mapValues } from 'lodash';
import { DateFilter } from '../core/DateFilter';
import { StringFilter } from '../core/StringFilter';

@InputType()
export class TenantAccountFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => Boolean, { nullable: true })
    enabled: boolean;

    @Field(type => StringFilter, { nullable: true })
    accessToken: StringFilter;

    @Field(type => StringFilter, { nullable: true })
    accountId: StringFilter;

    @Field(type => String, { nullable: true })
    institutionId: string;

    @Field(type => StringFilter, { nullable: true })
    itemId: StringFilter;

    @Field(type => ID, { nullable: true })
    tenantId: string;

    createFindOperator(): any {
        return mapValues(this, (value, key) =>
            typeof value === 'object' ? (<any>value).createFindOperator() : value
        );
    }
}
