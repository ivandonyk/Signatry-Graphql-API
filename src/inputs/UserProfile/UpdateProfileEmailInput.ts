import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class UpdateProfileEmailInput {
    @Field(type => ID, { nullable: true })
    id: string;

    @Field()
    value: string;

    @Field()
    isPrimary: boolean;
}
