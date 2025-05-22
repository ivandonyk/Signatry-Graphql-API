import { InputType, Field, Float } from 'type-graphql';

@InputType()
export class UserProfilePayload {
    @Field()
    sub: string;

    @Field()
    username: string;

    @Field()
    phoneNumber: string;

    @Field()
    emailAddress: string;

    @Field()
    firstName: string;

    @Field()
    lastName: string;

    @Field()
    customCode?: string;

    @Field({ nullable: true })
    institution?: string;

    @Field({ nullable: true })
    officeName?: string;
}
