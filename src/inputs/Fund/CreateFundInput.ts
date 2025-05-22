import { CreateFundAddressInput } from './CreateFundAddressInput';
import { AdvisorCreateFundInput } from './AdvisorCreateFundInput';
import { InputType, Field } from 'type-graphql';
import { InvestmentInput } from '../Investment/InvestmentInput';

@InputType()
export class CreateFundInput {
    @Field()
    name: string;

    @Field()
    firstName: string;

    @Field(type => String, { nullable: true })
    middleName: string;

    @Field()
    lastName: string;

    @Field(type => String, { nullable: true })
    suffix: string;

    @Field(type => String, { nullable: true })
    prefix: string;

    @Field(type => CreateFundAddressInput)
    address: CreateFundAddressInput;

    @Field()
    fundTypeId: string;

    @Field(type => String, { nullable: true })
    dateOfBirth: string;

    @Field()
    email: string;

    @Field(type => String, { nullable: true })
    secondaryEmail: string;

    @Field()
    phone: string;

    @Field(type => String, { nullable: true })
    secondaryPhone: string;

    @Field(type => CreateFundAddressInput, { nullable: true })
    secondaryAddress: CreateFundAddressInput;

    @Field(type => AdvisorCreateFundInput, { nullable: true })
    advisorCreateFundInput: AdvisorCreateFundInput;

    @Field()
    statementByMail: boolean;

    @Field()
    statementByPaperless: boolean;

    @Field(type => [InvestmentInput], { nullable: true })
    investments: InvestmentInput[];
}
