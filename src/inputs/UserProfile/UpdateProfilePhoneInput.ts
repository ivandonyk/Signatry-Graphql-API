import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class UpdateProfilePhoneInput {
    @Field(type => ID, { nullable: true })
    id: string;

    @Field()
    value: string;

    @Field()
    type: string;

    @Field()
    isPrimary: boolean;
}
