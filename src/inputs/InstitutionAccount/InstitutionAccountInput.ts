import { InputType, Field } from 'type-graphql';

@InputType()
export class InstitutionAccountInput {
    //  IA fields
    @Field(type => String, { nullable: true })
    displayName: string;

    @Field(type => String, { nullable: true })
    url: string;

    @Field(type => String, { nullable: true })
    fundId: string;

    // GL Fields
    @Field(type => String, { nullable: true })
    title: string;

    @Field(type => String, { nullable: true })
    accountNumber: string;
}
