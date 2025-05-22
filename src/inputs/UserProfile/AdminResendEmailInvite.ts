import { InputType, Field } from 'type-graphql';

@InputType()
export class AdminResendEmailInviteInput {
    @Field(type => String)
    username: string;

    @Field(type => String)
    firstName: string;

    @Field(type => String)
    lastName: string;

    @Field(type => String)
    role: string;

    @Field(type => String, { nullable: true })
    phone: string;

    @Field(type => String)
    email: string;
}
