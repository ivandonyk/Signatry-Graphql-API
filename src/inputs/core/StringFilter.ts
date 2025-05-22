import { InputType, Field } from 'type-graphql';
import { NumberFilter } from './NumberFilter';

@InputType()
export class StringFilter {
    @Field(type => String, { nullable: true })
    equal?: string;
}
