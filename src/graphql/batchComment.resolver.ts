import { Resolver, Mutation, Ctx, Arg, Query, Int } from 'type-graphql';
import { GraphQLContext } from '../context';
import { UtilityResolver } from './core/UtilityResolver';
import { Batch, BatchComment } from '../models';
import { AddCommentToBatchInput } from '../inputs/Batch/AddCommentToBatchInput';

@Resolver(type => BatchComment)
export class BatchCommentResolver extends UtilityResolver {
    @Query(type => [BatchComment])
    async batchComments(
        @Ctx() context: GraphQLContext,
        @Arg('batchId', type => String, { nullable: false }) batchId: string
    ): Promise<BatchComment[]> {
        const repo = context.typeorm.manager.getRepository(BatchComment);

        const comments = await repo.find({
            where: { batchId },
            order: { createdOn: 'DESC' }
        });

        return comments;
    }

    @Mutation(type => BatchComment)
    async addCommentToBatch(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: AddCommentToBatchInput
    ): Promise<BatchComment> {
        const profile = await this.getCurrentUserProfile(context);
        const { manager } = context.typeorm;
        const newComment = await manager.save(
            manager.create(BatchComment, {
                commentText: input.comment,
                batchId: input.batchId,
                createdBy: profile.id
            })
        );

        return newComment;
    }
}
