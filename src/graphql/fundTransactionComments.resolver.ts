import { Resolver, Ctx, Arg, Mutation } from 'type-graphql';
import { GraphQLContext } from '../context';
import { BaseResolver } from './core/BaseResolver';
import { FundTransaction, FundTransactionComment } from '../models';
import { PermissionLock } from '../decorators/permissionDecorator';
import { CreateFundTransactionCommentInput } from '../inputs/FundTransactionComment/CreateFundTransactionCommentInput';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver(type => FundTransactionComment)
export class FundTransactionCommentResolver extends BaseResolver {
    @PermissionLock(PermissionAccessType.ADMIN_GRANTS, PermissionAccessLevel.FULL)
    @Mutation(type => FundTransactionComment)
    async createFundTransactionComment(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateFundTransactionCommentInput
    ) {
        const { manager } = context.typeorm;

        // Get current user
        const profile = await this.getCurrentUserProfile(context);

        // Get transaction
        const transaction = await manager
            .getRepository(FundTransaction)
            .findOne(input.fundTransactionId);

        if (transaction === undefined) {
            throw new Error('Transaction not found');
        }

        const comment = manager.create(FundTransactionComment, {
            fundTransactionId: transaction.id,
            transactionStatusId: transaction.transactionStatusId,
            isHold: input.isHold,
            isCancel: input.isCancel,
            comment: input.comment.trim(),
            createdBy: profile.id,
            updatedBy: profile.id
        });

        return manager.save(comment);
    }
}
