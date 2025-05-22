import { InputType, Field, ID, registerEnumType } from 'type-graphql';
import { UpdateRecipientInput } from '../Recipient/UpdateRecipientInput';

@InputType()
export class UpdateRecipientBoardOfDirectorsMemberInput {
    @Field(type => ID, { nullable: true })
    id: string;

    @Field(type => UpdateRecipientInput, { nullable: true })
    recipient: UpdateRecipientInput;

    @Field(type => String, { nullable: true })
    name: string;

    @Field(type => String, { nullable: true })
    title: string;

    @Field(type => String, { nullable: true })
    company: string;

    @Field(type => Boolean, { nullable: false })
    isPrimary: boolean;
}
