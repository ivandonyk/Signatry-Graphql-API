import { ObjectType, Field, Float, InputType } from 'type-graphql';

@InputType('PerformanceRangeInput')
@ObjectType()
export class PerformanceRange {
    @Field(type => Date, { nullable: true })
    start: Date;

    @Field(type => Date)
    end: Date;
}

@ObjectType()
export class PerformanceDatum {
    @Field(type => Date)
    date: Date;

    @Field(type => Float, { nullable: true })
    beginningBalance: number;

    @Field(type => Float)
    endingBalance: number;
}

@ObjectType()
export class InvestmentPerformance {
    @Field(type => String)
    investmentId: string;

    @Field(type => String)
    name: string;

    @Field(type => String)
    color: string;

    @Field(type => PerformanceDatum)
    performance: PerformanceDatum[];
}
