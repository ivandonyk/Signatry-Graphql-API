import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { FundInvestmentOrderBy } from '../FundInvestment/FundInvestmentOrderBy';

@InputType()
export class InvestmentOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    description?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    defaultAllocationPercentage?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    closePrice?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    closePriceAsOf?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    tickerSymbol?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    orderNum?: OrderBy;

    @Field(type => FundInvestmentOrderBy, { nullable: true })
    fundAllocations?: FundInvestmentOrderBy;
}
