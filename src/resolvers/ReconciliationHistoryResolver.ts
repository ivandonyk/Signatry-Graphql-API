import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';

import { GraphQLContext } from '../context';
import { ReconciliationComment, ReconciliationHistory, UserProfile } from '../models';

@Resolver(type => ReconciliationHistory)
export class ReconciliationHistoryResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async createdByProfile(
        @Root() root: ReconciliationComment,
        @Ctx() context: GraphQLContext
    ) {
        const result = await context.typeorm
            .getRepository(UserProfile)
            .findOne({ id: root.createdBy });
        return result;
    }
}
