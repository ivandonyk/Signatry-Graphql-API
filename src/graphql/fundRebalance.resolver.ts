import _ from 'lodash';
import { Resolver, Query, Mutation, Ctx, Arg, Int } from 'type-graphql';
import { FundTransaction } from '../models/FundTransaction';

import { PermissionLock } from '../decorators/permissionDecorator';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { createRebalance } from '../utilities/rebalance';
import { CreateFundRebalanceInput } from '../inputs/FundTransactionRebalance/CreateFundRebalanceInput';

@Resolver(type => FundTransaction)
export class FundRebalanceResolver extends UtilityResolver {
    @Mutation(type => FundTransaction)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.READ)
    public async createFundRebalance(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => CreateFundRebalanceInput) input: CreateFundRebalanceInput
    ): Promise<FundTransaction> {
        const manager = context.typeorm.manager;
        const userProfile = await this.getCurrentUserProfile(context);
        // get id of user who initiated transfer
        const { id: userProfileId } = userProfile;

        // ensure allocation ratios add up to 1
        if (_.sumBy(input.instructions, a => a.percentage * 100) / 100 !== 1) {
            throw Error('The sum of divestment percentages must be equal to one.');
        }

        return await createRebalance(manager, userProfileId, input);
    }
}
