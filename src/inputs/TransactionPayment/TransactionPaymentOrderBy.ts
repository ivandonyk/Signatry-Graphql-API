import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class TransactionPaymentOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    amount?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    id?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    scheduledDate?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    paymentType: OrderBy;
}
