import { UtilityResolver } from './core/UtilityResolver';
import { Investment, Fund } from '../models';
import { InvestmentOrderBy } from '../inputs/Investment/InvestmentOrderBy';
import { InvestmentFilter } from '../inputs/Investment/InvestmentFilter';
import { Query, Int, Ctx, Root, Arg, Info, Resolver, Mutation } from 'type-graphql';
import { GraphQLContext } from '../context';
import { Permissions } from '../types/permissionsList';
import { PermissionLock } from '../decorators/permissionDecorator';
import NotPermittedError from '../errors/NotPermitted';
import { eventEmitter, EVENTS } from '../events';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { InvestmentType } from '../models/Investment';

@Resolver(type => Investment)
export class InvestmentsResolver extends UtilityResolver {
    @Query(type => [Investment])
    public async investments(@Ctx() context: GraphQLContext): Promise<Investment[]> {
        const repo = context.typeorm.getRepository(Investment);
        const query = this.createQuery(repo);
        return await query.getMany();
    }

    @Query(type => [Investment])
    public async poolInvestments(
        @Root() root: Investment,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('fundId', type => String, { nullable: true }) fundId?: string
    ): Promise<Investment[]> {
        const poolQuery = context.typeorm
            .createQueryBuilder(Investment, 'investment')
            .andWhere('investment.investmentType IN (:...investmentTypes)', {
                investmentTypes: [
                    InvestmentType.POOL,
                    InvestmentType.CONTRIBUTION_CASH,
                    InvestmentType.GRANT_CASH
                ]
            });

        const imaQuery = context.typeorm
            .createQueryBuilder(Investment, 'investment')
            .leftJoinAndSelect('investment.fundAllocations', 'fundInvestment')
            .andWhere('investment.investmentType IN (:...investmentTypes)', {
                investmentTypes: [InvestmentType.IMA]
            });

        if (fundId) {
            imaQuery.andWhere('fundInvestment.fundId = :fundId', { fundId });
        }
        const pools = await poolQuery.getMany();
        const imas = await imaQuery.getMany();
        return imas.concat(pools);
    }

    @Query(type => Int)
    public async investmentsCount(
        @Root() root: Investment,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('where', type => InvestmentFilter, { nullable: true })
        where?: InvestmentFilter
    ): Promise<number> {
        const repo = context.typeorm.getRepository(Investment);
        const query = this.createQuery(repo, where);
        const result = await query.getCount();
        return result;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [Investment])
    public async investmentsForFund(
        @Root() root: Investment,
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string
    ): Promise<Investment[]> {
        const fundRepo = context.typeorm.getRepository(Fund);

        // Ensure user has permissions to view this fund (TODO: fund permissions)
        const { profile: requestingUser } = await this.getPotentiallyImpersonatedProfile(context);
        const requestingUserPermissions = await this.getPermissionList(context);
        const fund = await fundRepo.findOne(fundId, { relations: ['fundUserProfiles'] });
        if (!fund) throw new Error(`Fund with provided id ${fundId} not found`);
        if (
            !fund.fundUserProfiles.find(user => user.userProfileId === requestingUser.id) && // fundUserProfiles doesn't include requesting user
            !requestingUserPermissions.some(
                permission =>
                    permission.accessType === PermissionAccessType.ADMIN_INVESTMENTS &&
                    (permission.accessLevel = PermissionAccessLevel.READ)
            ) // requesting user isn't an admin/staff
        ) {
            throw new NotPermittedError(
                'You do not have permission to view investments for this fund.'
            );
        }

        const repo = context.typeorm.getRepository(Investment);
        const investmentsForFund = await repo
            .createQueryBuilder('investment')
            .leftJoinAndSelect('investment.unitPriceHistory', 'unitPriceHistory')
            .leftJoinAndSelect('investment.fundAllocations', 'fundAllocation')
            .leftJoinAndSelect('fundAllocation.fund', 'fund')
            .where('fund.id = :fundId', { fundId })
            .getMany();

        return investmentsForFund;
    }
}
