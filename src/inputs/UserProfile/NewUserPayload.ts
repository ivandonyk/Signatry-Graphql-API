import { InputType, Field, Float } from 'type-graphql';

@InputType()
export class NewUserPayload {
    @Field()
    email: string;

    @Field()
    roleId: string;
}
