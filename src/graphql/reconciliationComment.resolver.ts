import { Resolver, Mutation, Ctx, Arg, Query, Int } from 'type-graphql';
import { GraphQLContext } from '../context';
import { UtilityResolver } from './core/UtilityResolver';
import { ReconciliationComment } from '../models';
import { AddCommentToReconciliationInput } from '../inputs/Reconciliation/AddCommentToReconciliationInput';

@Resolver(type => ReconciliationComment)
export class ReconciliationCommentResolver extends UtilityResolver {
    @Query(type => [ReconciliationComment])
    async reconciliationComments(
        @Ctx() context: GraphQLContext,
        @Arg('glAccountId', type => String, { nullable: false }) glAccountId: string
    ): Promise<ReconciliationComment[]> {
        const repo = context.typeorm.manager.getRepository(ReconciliationComment);

        const comments = await repo.find({
            where: { glAccountId: glAccountId },
            order: { createdOn: 'DESC' }
        });

        return comments;
    }

    @Mutation(type => ReconciliationComment)
    async addCommentToReconciliation(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: AddCommentToReconciliationInput
    ): Promise<ReconciliationComment> {
        const profile = await this.getCurrentUserProfile(context);
        const { manager } = context.typeorm;
        const newComment = await manager.save(
            manager.create(ReconciliationComment, {
                commentText: input.comment,
                glAccountReconciliationId: input.reconciliationId,
                glAccountId: input.glAccountId,
                createdBy: profile.id
            })
        );

        return newComment;
    }
}
