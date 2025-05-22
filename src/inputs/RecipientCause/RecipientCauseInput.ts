import { InputType, Field, ID, Int } from 'type-graphql';

@InputType()
export class RecipientCauseInput {
    @Field(type => ID, { nullable: false })
    id: string;

    @Field(type => Boolean, { nullable: true })
    isPrimary: boolean;

    @Field(type => Int, { nullable: true })
    ordinal: number;
}
