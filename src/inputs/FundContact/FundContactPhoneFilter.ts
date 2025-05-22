import { InputType, Field, ID } from 'type-graphql';
import { DateFilter } from '../core/DateFilter';
import { StringFilter } from '../core/StringFilter';

@InputType()
export class FundContactPhoneFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => StringFilter, { nullable: true })
    value: StringFilter;

    @Field(type => Boolean, { nullable: true })
    isPrimary: boolean;

    @Field(type => ID, { nullable: true })
    fundContactId: string;
}
