import { OrderBy } from '../core/OrderBy';
import { InputType, Field } from 'type-graphql';
import { InstitutionAccountOrderBy } from '../InstitutionAccount/InstitutionAccountOrderBy';

@InputType()
export class GLAccountOrderBy {
    @Field(type => OrderBy, { nullable: true })
    title?: OrderBy;

    @Field(type => OrderBy, { nullable: true })
    accountNumber?: OrderBy;

    @Field(type => InstitutionAccountOrderBy, { nullable: true })
    institutionAccount?: InstitutionAccountOrderBy;
}
