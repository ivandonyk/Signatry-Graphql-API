import { UtilityResolver } from './core/UtilityResolver';
import { FundTransactionInfo } from '../models';
import { Mutation, Ctx, Arg, Resolver } from 'type-graphql';
import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import { Permissions } from '../types/permissionsList';
import { UpdateTransactionInfoInput } from '../inputs/TransactionInfo/UpdateTransactionInfoInput';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver(type => FundTransactionInfo)
export class FundTransactionInfoResolver extends UtilityResolver {
    @PermissionLock(PermissionAccessType.ADMIN_GRANTS, PermissionAccessLevel.FULL)
    @Mutation(type => FundTransactionInfo)
    public async updateTransactionInfo(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => UpdateTransactionInfoInput, { nullable: false })
        input: UpdateTransactionInfoInput
    ): Promise<FundTransactionInfo> {
        const repo = context.typeorm.getRepository(FundTransactionInfo);
        const transactionInfo = await repo.findOne(input.id);
        return repo.save({
            ...transactionInfo,
            ...input
        });
    }
}
