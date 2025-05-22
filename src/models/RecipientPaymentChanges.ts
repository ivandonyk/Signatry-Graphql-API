import { PreferredPaymentChanges } from './';
import { ObjectType, Field, Int, Float } from 'type-graphql';

@ObjectType()
export class RecipientPaymentChanges {
    @Field(type => PreferredPaymentChanges, { nullable: true })
    preferredPayment: PreferredPaymentChanges;
}
