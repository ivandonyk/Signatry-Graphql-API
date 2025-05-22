import { InputType, Field } from 'type-graphql';

@InputType()
export class RecipientContactFilter {
    @Field(type => String, { nullable: true })
    orgContactName: string;
}
