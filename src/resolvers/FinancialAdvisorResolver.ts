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
import { FinancialAdvisor, UserProfile } from '../models';

@Resolver(FinancialAdvisor)
export class FinancialAdvisorResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async userProfile(@Root() root: FinancialAdvisor, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(UserProfile);
        const builder = repo
            .createQueryBuilder('userProfile')
            .where('userProfile.id = :id', { id: root.userProfileId });
        const result = await builder.getOne();
        return result;
    }
}
