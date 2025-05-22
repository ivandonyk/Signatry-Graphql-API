import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateProfilePhoneInput {
    @Field()
    isPrimary: boolean;

    @Field()
    value: string;
}
