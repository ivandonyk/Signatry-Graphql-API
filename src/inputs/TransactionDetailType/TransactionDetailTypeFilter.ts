import { InputType, Field } from 'type-graphql';

import { TransactionDetailTypeName } from '../../models/TransactionDetailType';
@InputType()
export class TransactionDetailTypeFilter {
    @Field(type => String || TransactionDetailTypeName)
    name: string | TransactionDetailTypeName;
}
