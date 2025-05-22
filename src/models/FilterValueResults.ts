import { ObjectType, Field, registerEnumType } from 'type-graphql';

@ObjectType()
export class FilterValue {
    @Field()
    text: string;

    @Field(() => String || Date || { nullable: true })
    value?: string | Date;
}

@ObjectType()
export class FilterValueResults {
    @Field()
    timestamp: Date;

    @Field(() => [FilterValue])
    data?: FilterValue[];
}

@ObjectType()
export class FilterTypeResults {
    @Field(() => [String])
    types: string[];
}

export enum BatchFilterTypes {
    SOURCE = 'source',
    DESTINATION = 'destination',
    STATUS = 'status'
}
registerEnumType(BatchFilterTypes, {
    name: 'BatchFilterTypes',
    description: 'enum of possible filter types for batches'
});

export enum MoneyMovementTypes {
    TYPE = 'type',
    FUND = 'fund',
    DONOR = 'donor',
    SOURCE = 'source',
    DESTINATION = 'destination'
}
registerEnumType(MoneyMovementTypes, {
    name: 'MoneyMovementTypes',
    description: 'enum of possible filter types for money movement'
});

export enum AllTransactionTypes {
    TYPE = 'type',
    FUND = 'fund',
    STATUS = 'status',
    SOURCE = 'source',
    DESTINATION = 'destination'
}
registerEnumType(AllTransactionTypes, {
    name: 'AllTransactionTypes',
    description: 'enum of possible filter types for all transactions view'
});

export enum GrantFilterTypes {
    // DATE = 'date', Will be required in the future
    HOLD = 'hold',
    FUND = 'fund',
    RECIPIENT = 'recipient',
    STATUS = 'status'
}
registerEnumType(GrantFilterTypes, {
    name: 'GrantFilterTypes',
    description: 'enum of possible filter types for grants'
});

export enum ContributionsFilterTypes {
    TYPE = 'type',
    FUND = 'fund',
    DONOR = 'donor',
    STATUS = 'status'
}
registerEnumType(ContributionsFilterTypes, {
    name: 'ContributionsFilterTypes',
    description: 'enum of possible filter types for contributions'
});
