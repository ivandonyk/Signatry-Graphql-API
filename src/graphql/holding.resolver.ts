import { UtilityResolver } from './core/UtilityResolver';
import { GLAccount, Holding, HoldingChangeSummary } from '../models';
import { Query, Mutation, Int, Ctx, Arg, Resolver } from 'type-graphql';
import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import { Permissions } from '../types/permissionsList';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { holdingUtil } from '../utilities/holding';

@Resolver(() => Holding)
export class HoldingResolver extends UtilityResolver {
    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.FULL)
    @Query(type => HoldingChangeSummary)
    public async getHoldingChangeSummaryForAccount(
        @Ctx() context: GraphQLContext,
        @Arg('glAccountId', type => String)
        glAccountId: string,
        @Arg('startDate', type => Date)
        startDate: Date,
        @Arg('endDate', type => Date)
        endDate: Date
    ): Promise<HoldingChangeSummary> {
        return await holdingUtil.getHoldingChangeSummaryForAccount(glAccountId, startDate, endDate);
    }
}
