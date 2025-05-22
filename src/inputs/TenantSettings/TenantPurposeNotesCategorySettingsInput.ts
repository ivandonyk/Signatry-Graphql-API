import { InputType, Field, Int, Float, ID } from 'type-graphql';

@InputType()
export class TenantPurposeNotesCategorySettingsInput {
    @Field(type => String, { nullable: false })
    category: string;

    @Field(type => String, { nullable: false })
    disclosure: boolean;
}
