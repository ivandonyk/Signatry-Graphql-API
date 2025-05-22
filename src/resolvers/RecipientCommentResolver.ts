import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { Recipient, RecipientComment } from '../models';
import { UtilityResolver } from '../graphql/core/UtilityResolver';

import { GraphQLContext } from '../context';
import { UserProfile } from '../models';

@Resolver(type => RecipientComment)
export class RecipientCommentResolver extends UtilityResolver {
    @FieldResolver(type => Recipient)
    public async recipient(@Root() root: RecipientComment, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(Recipient).findOne({ id: root.recipientId });
    }

    @FieldResolver(type => UserProfile)
    public async author(@Root() root: RecipientComment, @Ctx() context: GraphQLContext) {
        const profile = await context.typeorm.getRepository(UserProfile).findOne({
            id: root.createdBy
        });
        return profile;
    }
}
