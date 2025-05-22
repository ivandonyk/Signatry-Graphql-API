import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';

import { GraphQLContext } from '../context';
import { ReconciliationComment, UserProfile } from '../models';

@Resolver(type => ReconciliationComment)
export class ReconciliationCommentResolver extends UtilityResolver {
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
