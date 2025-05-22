import { Fund } from '../../models';
import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class FundsInput {
    @Field(type => [Fund], { nullable: false })
    funds: Fund[];
}
