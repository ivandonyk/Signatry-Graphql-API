import { TransferType } from '../../utilities/transfers';
import { InputType, Field, Float } from 'type-graphql';
import { InvestmentInput } from '../Investment/InvestmentInput';

@InputType()
export class CreateFundRebalanceInput {
    @Field(type => String, { nullable: true })
    fundId?: string;

    @Field(type => Float)
    amount: number;

    @Field(type => [InvestmentInput])
    instructions: InvestmentInput[];
}
