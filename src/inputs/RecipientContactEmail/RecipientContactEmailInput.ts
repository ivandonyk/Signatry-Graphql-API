import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class RecipientContactEmailInput {
    @Field(type => ID, { nullable: true })
    id: string;

    @Field(type => String, { nullable: true })
    value: string;
}
