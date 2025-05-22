import { InputType, Field, ID } from 'type-graphql';

import { DateFilter } from '../core/DateFilter';
import { BatchStatusValue } from '../../models/Batch';

@InputType()
export class BatchFilter {
    @Field(type => [String], { nullable: true })
    status?: BatchStatusValue[];

    @Field(type => [String], { nullable: true })
    source?: string[];

    @Field(type => [String], { nullable: true })
    destination?: string[];
}
