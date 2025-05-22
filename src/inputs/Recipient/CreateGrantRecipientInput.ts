import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateGrantRecipientInput {
    @Field(type => String, { nullable: false })
    name: string;

    @Field(type => String, { nullable: false })
    employerIdentificationNumber: string;

    @Field(type => String, { nullable: true })
    contactName: string;

    @Field(type => String, { nullable: true })
    contactPhoneNumber: string;

    @Field(type => String, { nullable: true })
    addressLineOne: string;

    @Field(type => String, { nullable: true })
    addressLineTwo: string;

    @Field(type => String, { nullable: true })
    city: string;

    @Field(type => String, { nullable: true })
    state: string;

    @Field(type => String, { nullable: true })
    postalCode: string;
}
