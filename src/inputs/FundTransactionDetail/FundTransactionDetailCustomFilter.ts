import { InputType, Field } from 'type-graphql';

@InputType()
export class TransactionDetailCustomFilter {
    @Field(type => String, { nullable: true })
    type: string[];

    @Field(type => String, { nullable: true })
    fund: string[];

    @Field(type => String, { nullable: true })
    donor: string[];

    @Field(type => String, { nullable: true })
    source: string[];

    @Field(type => String, { nullable: true })
    destination: string[];
}
