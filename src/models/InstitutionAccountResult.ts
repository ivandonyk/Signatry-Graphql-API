import { ObjectType, Field, Int } from 'type-graphql';
import { InstitutionAccount } from './InstitutionAccount';

@ObjectType()
export class InstitutionAccountResult {
    @Field(() => Int)
    count: number;

    @Field(() => InstitutionAccount)
    data: InstitutionAccount[];
}
