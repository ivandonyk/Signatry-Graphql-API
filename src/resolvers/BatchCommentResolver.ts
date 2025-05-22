import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';

import { GraphQLContext } from '../context';
import { BatchComment, UserProfile } from '../models';

@Resolver(type => BatchComment)
export class BatchCommentResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async createdByProfile(@Root() root: BatchComment, @Ctx() context: GraphQLContext) {
        const result = await context.typeorm
            .getRepository(UserProfile)
            .findOne({ id: root.createdBy });
        return result;
    }
}
