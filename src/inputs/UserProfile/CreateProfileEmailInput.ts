import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateProfileEmailInput {
    @Field()
    value: string;

    @Field()
    isPrimary: boolean;
}
