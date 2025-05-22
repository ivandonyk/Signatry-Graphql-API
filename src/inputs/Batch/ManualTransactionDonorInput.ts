import { InputType, Field } from 'type-graphql';
@InputType()
class ValueInput {
    @Field(type => String, { nullable: false })
    id: string;
    @Field(type => String, { nullable: false })
    value: string;
}
@InputType()
export class ManualTransactionsDonorInput {
    @Field(type => String, { nullable: false })
    id: string;
    @Field(type => String, { nullable: false })
    fullName: string;
    @Field(type => ValueInput, { nullable: true })
    primaryEmail: ValueInput;
}
