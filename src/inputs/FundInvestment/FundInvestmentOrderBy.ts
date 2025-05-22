import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { FundOrderBy } from '../Fund/FundOrderBy';

@InputType()
export class FundInvestmentOrderBy {
    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    updatedOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    percentage?: OrderBy;

    @Field(type => FundOrderBy, { nullable: true })
    fund?: FundOrderBy;
}
