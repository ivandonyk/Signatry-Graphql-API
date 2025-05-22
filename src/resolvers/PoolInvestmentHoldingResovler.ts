import {
    Resolver,
    Query,
    Ctx,
    Mutation,
    Arg,
    FieldResolver,
    Root,
    Info,
    Int,
    ID
} from 'type-graphql';
import { GraphQLContext } from '../context';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { PoolInvestmentHolding } from '../models';

@Resolver(PoolInvestmentHolding)
export class PoolInvestmentHoldingResolver extends UtilityResolver {
    @FieldResolver(type => String)
    public assetClass(@Root() root: PoolInvestmentHolding, @Ctx() context: GraphQLContext) {
        return root.getAssetClass();
    }

    @FieldResolver(type => String)
    public id(@Root() root: PoolInvestmentHolding, @Ctx() context: GraphQLContext) {
        return root.getId();
    }
}
