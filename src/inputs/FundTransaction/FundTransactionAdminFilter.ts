import { InputType, Field } from 'type-graphql';

@InputType()
export class FundTransactionAdminFilter {
    @Field(type => String, { nullable: true })
    lessThan?: string;

    @Field(type => String, { nullable: true })
    fund: string[];

    @Field(type => String, { nullable: true })
    recipient: string[];

    @Field(type => String, { nullable: true })
    status: string[];

    @Field(type => String, { nullable: true })
    hold: string[];

    @Field(type => String, { nullable: true })
    donor: string[];

    @Field(type => String, { nullable: true })
    type: string[];
}
