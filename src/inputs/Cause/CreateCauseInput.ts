import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateCauseInput {
    @Field()
    name: string;

    @Field({ nullable: true })
    description: string;
}
