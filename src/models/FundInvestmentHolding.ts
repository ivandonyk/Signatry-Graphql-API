import { ObjectType, Field, Float } from 'type-graphql';
import { InvestmentHoldingResult } from '.';

@ObjectType()
export class FundInvestmentHoldingResult extends InvestmentHoldingResult {
    @Field(type => String, { nullable: true })
    color?: string;

    @Field(type => String, { nullable: true })
    ticker?: string;

    @Field(type => String, { nullable: true })
    assetClass?: string;
}

@ObjectType()
export class IMAHoldingResult extends FundInvestmentHoldingResult {
    @Field(type => String)
    parentId: string;

    @Field(type => String)
    parentName: string;

    @Field(type => String)
    parentColor: string;
}

@ObjectType()
export class FundInvestmentCashHolding {
    @Field(type => String)
    name: string;

    @Field(type => Float)
    marketValue: number;

    @Field(type => Date)
    date: Date;

    @Field(type => String)
    color: string;

    @Field(type => String)
    assetClass: string;
}

@ObjectType()
export class FundInvestmentHolding {
    @Field(type => Date)
    date: Date;

    @Field(type => String)
    fundId: string;

    @Field(type => String)
    fundName: string;

    @Field(type => FundInvestmentHoldingResult)
    pools: FundInvestmentHoldingResult[];

    @Field(type => FundInvestmentHoldingResult)
    sharedStocks?: FundInvestmentHoldingResult[];

    @Field(type => IMAHoldingResult)
    imas: IMAHoldingResult[];

    @Field(type => FundInvestmentCashHolding, { nullable: true })
    currentCashHolding?: FundInvestmentCashHolding;
}
