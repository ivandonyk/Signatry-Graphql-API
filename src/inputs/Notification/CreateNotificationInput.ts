import { InputType, Field } from 'type-graphql';

@InputType()
export class CreateNotificationInput {
    @Field()
    name: string;

    @Field()
    enabled: boolean;
}
