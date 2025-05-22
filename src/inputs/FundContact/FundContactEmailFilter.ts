import { InputType, Field, ID } from 'type-graphql';
import { DateFilter } from '../core/DateFilter';

@InputType()
export class FundContactEmailFilter {
    @Field(type => ID, { nullable: true })
    id?: string;

    @Field(type => DateFilter, { nullable: true })
    createdOn?: DateFilter;

    @Field(type => String, { nullable: true })
    value: string;

    @Field(type => Boolean, { nullable: true })
    isPrimary: boolean;

    @Field(type => ID, { nullable: true })
    fundContactId: string;
}
