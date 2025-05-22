import { InputType, Field, Int, Float, ID } from 'type-graphql';
import { CreateFundAddressInput } from '../Fund/CreateFundAddressInput';

@InputType()
export class AdvisorIMAInput {
    @Field(type => String, { nullable: false })
    fundName: string;

    @Field(type => String, { nullable: false })
    fundCode: string;

    @Field(type => String, { nullable: false })
    advisorFullName: string;

    @Field(type => String, { nullable: true })
    advisorOfficeName: string;

    @Field(type => String, { nullable: true })
    advisorInstitutionName: string;

    @Field(type => String, { nullable: false })
    advisorEmail: string;

    @Field(type => String, { nullable: true })
    advisorPhoneNumber: string;

    @Field(type => CreateFundAddressInput, { nullable: true })
    advisorAddress: CreateFundAddressInput;
}
