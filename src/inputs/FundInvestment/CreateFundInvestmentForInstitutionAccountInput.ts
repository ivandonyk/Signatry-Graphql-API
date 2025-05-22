import { InputType, Field, Float } from 'type-graphql';

@InputType()
export class CreateFundInvestmentForInstitutionAccountInput {
    @Field()
    institutionAccountId: string;

    @Field()
    fundId: string;

    @Field({ nullable: true })
    override?: boolean;
}
