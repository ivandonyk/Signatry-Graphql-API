import { Query, Ctx, Arg, Resolver, Mutation } from 'type-graphql';

import { UtilityResolver } from './core/UtilityResolver';
import { InstitutionAccountTransaction, InstitutionAccountTransactionResult } from '../models';
import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { InstitutionAccountTransactionRepository } from '../repositories/InstitutionAccountTransaction';
import { institutionAccountTransactionUtil } from '../utilities/institutionAccountTransaction';

@Resolver(() => InstitutionAccountTransaction)
export class InstitutionAccountTransactionResolver extends UtilityResolver {
    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.READ)
    @Query(type => InstitutionAccountTransactionResult)
    public async getUnreconciledTransactionsForGLAccount(
        @Ctx() context: GraphQLContext,
        @Arg('glAccountId', type => String) glAccountId: string,
        @Arg('toDate', type => Date, { nullable: false }) toDate: Date
    ): Promise<InstitutionAccountTransactionResult> {
        const repo = context.typeorm.getCustomRepository(InstitutionAccountTransactionRepository);
        const result = await repo.getUnreconciledTransactions(glAccountId, toDate);
        const summary = institutionAccountTransactionUtil.getTransactionSummary(result);

        return {
            count: result.length,
            data: result,
            summary: summary
        };
    }

    @Mutation(type => [String])
    public async ignoreTransactions(
        @Ctx() context: GraphQLContext,
        @Arg('ids', type => [String]) ids: string[]
    ): Promise<string[]> {
        if (!ids.length) return [];

        await context.typeorm
            .createQueryBuilder()
            .update(InstitutionAccountTransaction)
            .set({ isIgnored: true })
            .where('id IN (:...ids)', { ids })
            .execute();

        return ids;
    }

    @Query(type => InstitutionAccountTransaction)
    public async institutionAccountTransaction(
        @Ctx() context: GraphQLContext,
        @Arg('transactionId', type => String) transactionId: string
    ): Promise<InstitutionAccountTransaction> {
        return await context.typeorm.getRepository(InstitutionAccountTransaction).findOne({
            where: { transactionId },
            relations: ['institutionAccount', 'holding', 'holding.security']
        });
    }
}
