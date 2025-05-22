import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateTenantAccountInput {
    @Field()
    accountId: string;

    @Field()
    publicToken: string;
}
