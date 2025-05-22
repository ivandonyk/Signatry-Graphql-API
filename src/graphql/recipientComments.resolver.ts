import { Resolver, Ctx, Arg, Mutation } from 'type-graphql';
import { GraphQLContext } from '../context';
import { BaseResolver } from './core/BaseResolver';
import { Recipient, RecipientComment } from '../models';
import { RecipientCommentInput } from './../inputs/RecipientComment/RecipientCommentInput';

@Resolver(type => RecipientComment)
export class RecipientCommentsResolver extends BaseResolver {
    @Mutation(type => RecipientComment)
    async createRecipientComment(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: RecipientCommentInput
    ) {
        const { manager } = context.typeorm;

        // Get current user
        const profile = await this.getCurrentUserProfile(context);

        // Get recipient
        const recipient = await manager.getRepository(Recipient).findOne(input.recipientId);

        if (recipient === undefined) {
            throw new Error('Recipient not found');
        }

        const comment = manager.create(RecipientComment, {
            recipientId: recipient.id,
            comment: input.comment.trim(),
            createdBy: profile.id,
            updatedBy: profile.id
        });

        return manager.save(comment);
    }
}
