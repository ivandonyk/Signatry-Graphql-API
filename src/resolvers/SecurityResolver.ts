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

@Resolver(type => Security)
export class SecurityResolver extends UtilityResolver {
    @FieldResolver(type => [Holding])
    public async holdings(@Root() root: Security, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(Holding);
        if (!root.holdings) {
            root.holdings = await repo.find({ securityId: root.id });
        }
        return root.holdings;
    }
    @FieldResolver(type => String)
    public id(@Root() root: Security, @Ctx() context: GraphQLContext) {
        return root.id;
    }
}
