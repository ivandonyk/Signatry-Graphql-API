import { ObjectType, Field, Int, Float } from 'type-graphql';

@ObjectType()
export class TenantPurposeNotesCategorySettings {
    @Field(type => String, { nullable: false })
    category: string;

    @Field(type => String, { nullable: false })
    disclosure: boolean;
}
