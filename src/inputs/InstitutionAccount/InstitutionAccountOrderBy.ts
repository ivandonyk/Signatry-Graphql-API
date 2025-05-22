import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';

@InputType()
export class InstitutionAccountOrderBy {
    @Field(type => OrderBy, { nullable: true })
    name?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    accountId?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    accountNumber?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    marketValue?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    createdOn?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    lastUpdated?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    fundName?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    financialAdvisor?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    institution?: OrderBy;
}
