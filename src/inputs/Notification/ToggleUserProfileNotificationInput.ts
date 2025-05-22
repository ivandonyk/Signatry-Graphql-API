import { InputType, Field } from 'type-graphql';

@InputType()
export class ToggleUserProfileNotificationInput {
    @Field(type => String, { nullable: true })
    id: string;

    @Field(type => String, { nullable: false })
    fundId: string;

    @Field(type => String, { nullable: true })
    notificationType: string;

    @Field(type => Boolean, { nullable: true })
    value: boolean;
}
