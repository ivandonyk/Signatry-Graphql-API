import { InputType, Field } from 'type-graphql';

import { TransactionTypeValue } from '../../models/TransactionType';
import { TransactionDetailTypeName } from '../../models/TransactionDetailType';
@InputType()
export class MoneyMovementInput {
    @Field()
    fundInvestmentId: string;

    @Field()
    amount: string;
}

@InputType()
export class MoneyMovementTransactionInput {
    @Field()
    fundId: string;

    @Field(type => TransactionDetailTypeName)
    detailType: TransactionDetailTypeName;

    /** optional fields for existing transactions */
    @Field({ nullable: true })
    id: string;

    /** optional fields for new transactions */
    @Field({ nullable: true })
    description: string;

    @Field({ nullable: true })
    amount: string;

    @Field(type => TransactionTypeValue, { nullable: true })
    type: TransactionTypeValue;
}
