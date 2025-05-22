import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class OneTimeGrantInput {
    @Field({ nullable: true })
    payBy: string; // if null then + 5 days in the future
}
