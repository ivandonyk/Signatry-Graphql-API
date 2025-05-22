import { InputType, Field } from 'type-graphql';

@InputType()
export class AdvisorCreateFundInput {
    @Field(type => String)
    advisorFullName: string;

    @Field(type => String)
    advisorOfficeName: string;

    @Field(type => String)
    advisorInstitutionName: string;

    @Field(type => String)
    advisorEmail: string;

    @Field(type => String)
    advisorPhoneNumber: string;

    @Field(type => String)
    advisorAddressLineOne: string;

    @Field(type => String)
    advisorAddressLineTwo: string;

    @Field(type => String)
    advisorCity: string;

    @Field(type => String)
    advisorState: string;

    @Field(type => String)
    advisorZipCode: string;
}
