import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class PeopleFilter {
    @Field(type => ID, { nullable: true })
    userProfileId?: string;

    @Field(type => String, { nullable: true })
    emailAddress?: string;
}
