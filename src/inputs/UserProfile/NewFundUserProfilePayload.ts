import { InputType, Field, Float } from 'type-graphql';

@InputType()
export class NewFundUserProfilePayload {
    @Field()
    email: string;

    @Field()
    fundName: string;

    @Field()
    fundType: string;

    @Field()
    roleId: string;

    @Field()
    pendingFundUserId: string;
}
