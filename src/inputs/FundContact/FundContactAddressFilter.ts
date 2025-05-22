import { InputType, Field, ID } from 'type-graphql';
import { DateFilter } from '../core/DateFilter';
import { StringFilter } from '../core/StringFilter';

@InputType()
export class FundContactAddressFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => StringFilter, { nullable: true })
    lineOne: StringFilter;

    @Field(type => StringFilter, { nullable: true })
    lineTwo: StringFilter;

    @Field(type => StringFilter, { nullable: true })
    city: StringFilter;

    @Field(type => StringFilter, { nullable: true })
    state: StringFilter;

    @Field(type => StringFilter, { nullable: true })
    postalCode: StringFilter;

    @Field(type => StringFilter, { nullable: true })
    country: StringFilter;

    @Field(type => Boolean, { nullable: true })
    isPrimary: boolean;

    @Field(type => ID, { nullable: true })
    fundContactId: string;
}
