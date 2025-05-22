import { ObjectType, Field, Float } from 'type-graphql';
import { GLAccountReconciliation } from './GLAccountReconciliation';

@ObjectType()
export class ReconciliationCountResults {
    @Field()
    timestamp: Date;

    @Field()
    internalCount: number;

    @Field()
    imaCount: number;
}

@ObjectType()
export class ReconciliationResults {
    @Field()
    timestamp: Date;

    @Field()
    count: number;

    @Field(() => [GLAccountReconciliation])
    data: GLAccountReconciliation[];
}
