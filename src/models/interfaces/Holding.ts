import { InterfaceType, Field, Int, Float } from 'type-graphql';

export enum HoldingAssetClass {
    UNCLASSIFIED = 'Unclassified',
    STOCKS = 'Stocks',
    BONDS = 'Bonds',
    CASH = 'Cash',
    REAL_ESTATE = 'Real Estate',
    OTHER = 'Other',
    POOL = 'Pool'
}

@InterfaceType()
export abstract class HoldingInterface {
    @Field(type => Float)
    units: number;

    @Field(type => Float)
    unitPrice: number;

    @Field(type => Float)
    marketValue: number;

    @Field(type => Date)
    date: Date;

    @Field(type => Date)
    priceAsOf: Date;

    @Field(type => String)
    id: string;

    @Field(type => String, { nullable: true })
    assetClass: HoldingAssetClass;

    @Field(type => Float, { nullable: true })
    costBasis: number;

    @Field(type => Float, { nullable: true })
    cumulativeAverageCost: number;

    @Field(type => Float, { nullable: true })
    cumulativeUnrealized: number;

    @Field(type => Float, { nullable: true })
    cumulativeRealized: number;

    abstract getId(): string;

    abstract getAssetClass(): HoldingAssetClass;
}
