import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { InvestmentOrderBy } from '../Investment/InvestmentOrderBy';

@InputType()
export class InvestmentUnitPriceHistoryOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    closePrice?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    closePriceAsOf?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    previousPrice?: OrderBy;

    @Field(type => InvestmentOrderBy, { nullable: true })
    investment?: InvestmentOrderBy;
}
