import { InputType, Field } from 'type-graphql';

import { AllTransactionTypes } from '../../models/FilterValueResults';

@InputType()
class Input {
    @Field(type => AllTransactionTypes)
    type: AllTransactionTypes;

    @Field(type => [String])
    value: string[];
}

@InputType()
class RangeLimits {
    @Field(type => Date, { nullable: true })
    start: Date;

    @Field(type => Date, { nullable: true })
    end: Date;
}

@InputType()
export class AllTransactionFilter {
    @Field(type => [Input])
    inputs: Input[];

    @Field(type => RangeLimits)
    rangeLimits: RangeLimits;

    @Field(type => Boolean, {
        nullable: true,
        description: 'whether or not to refresh the materialize "vw_all_transaction" view'
    })
    refresh: boolean;
}
