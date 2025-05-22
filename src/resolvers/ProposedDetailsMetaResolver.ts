import { ProposedDetailsMeta } from '../models/FundTransactionMetadata';
import { FundInvestment } from '../models/FundInvestment';
import { Resolver, FieldResolver, Ctx, Root, Info } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => ProposedDetailsMeta)
export class ProposedDetailsMetaResolver extends UtilityResolver {
    @FieldResolver(type => FundInvestment)
    public async fundInvestment(@Root() root: ProposedDetailsMeta, @Ctx() context: GraphQLContext) {
        return await context.typeorm.getRepository(FundInvestment).findOne(root.fundInvestmentId);
    }
}
