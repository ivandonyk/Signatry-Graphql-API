import { InputType, Field } from 'type-graphql';

@InputType()
export class FinancialAdvisorInput {
    @Field(type => String, { nullable: false })
    id: string;

    @Field(type => String, { nullable: false })
    fullName: string;

    @Field(type => String, { nullable: false })
    email: string;

    @Field(type => String, { nullable: true })
    officeName: string;

    @Field(type => Boolean, { nullable: false })
    receivesInstructions: boolean;

    @Field(type => Boolean, { nullable: false })
    isNew: boolean;

    @Field(type => Boolean, { nullable: false })
    isDeleted: boolean;
}
