import { InputType, Field, ID } from 'type-graphql';

@InputType()
export class UpdateTransactionInfoInput {
    @Field(type => ID, { nullable: false })
    id: string;

    @Field(type => Boolean, { nullable: true })
    purposeNotesApproved: boolean;

    @Field(type => Boolean, { nullable: true })
    specialInstructionsApproved: boolean;
}
