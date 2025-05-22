import { InputType, Field, Int, Float, ID } from 'type-graphql';

@InputType()
export class FundTypeInput {
    @Field(type => String, { nullable: true })
    id: string;

    @Field(type => String, { nullable: false })
    name: string;

    @Field(type => String, { nullable: false })
    description: string;

    @Field(type => Int, { nullable: false })
    orderNum: number;

    @Field(type => Boolean, { nullable: false })
    enabled: boolean;
}
