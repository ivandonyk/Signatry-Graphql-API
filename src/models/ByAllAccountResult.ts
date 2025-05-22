import { BAAAccount } from '../morningstar/byallaccounts/account';
import { ObjectType, Field, Int, Float } from 'type-graphql';

@ObjectType()
export class ByAllAccount {

    @Field(type => String, { nullable: false })
    accountId: string;

    @Field(type => String, { nullable: false })
    accountNumber: string;

    @Field(type => String, { nullable: false })
    name: string;

    @Field(type => String, { nullable: false })
    accountType: string;

    @Field(type => Date, { nullable: true })
    lastUpdated: Date;

    @Field(type => Float, { nullable: true })
    marketValue: number;

    @Field(type => String, { nullable: false })
    financialProfileId: string;

    @Field(type => String, { nullable: false })
    custodianName: string;
}

@ObjectType()
export class ByAllAccountResult {
    @Field(() => Int)
    count: number;

    @Field(() => ByAllAccount)
    data: ByAllAccount[];
}