import { ObjectType, Field, Int, Float } from 'type-graphql';

@ObjectType()
export class PreferredPaymentChanges {
    @Field(type => String, { nullable: true })
    to: string;

    @Field(type => String, { nullable: true })
    from: string;
}
