import { InputType, Field } from 'type-graphql';

@InputType()
export class CauseFilter {
    @Field(type => String, { nullable: true })
    name: string;

    @Field(type => String, { nullable: true })
    code: string;

    @Field(type => String, { nullable: true })
    primaryCode: string;
}
