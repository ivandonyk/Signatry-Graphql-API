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
import { Holding, Security } from '../models';

@Resolver(Holding)
export class HoldingResolver extends UtilityResolver {
    @FieldResolver(type => Security)
    public async security(@Root() root: Holding, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(Security);
        if (!root.security) {
            if (root.securityId) {
                root.security = await repo.findOne(root.securityId);
            } else {
                root.security = null;
            }
        }
        return root.security;
    }

    @FieldResolver(type => String)
    public assetClass(@Root() root: Holding, @Ctx() context: GraphQLContext) {
        return root.getAssetClass();
    }

    @FieldResolver(type => String)
    public id(@Root() root: Holding, @Ctx() context: GraphQLContext) {
        return root.getId();
    }
}
