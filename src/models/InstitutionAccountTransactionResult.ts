import { ObjectType, Field, Int } from 'type-graphql';
import { InstitutionAccountTransaction } from '.';
import { InstitutionAccountTransactionSummary } from '.';

@ObjectType()
export class InstitutionAccountTransactionResult {
    @Field(() => Int)
    count: number;

    @Field(() => InstitutionAccountTransaction)
    data: InstitutionAccountTransaction[];

    @Field(() => InstitutionAccountTransactionSummary)
    summary: InstitutionAccountTransactionSummary;
}
