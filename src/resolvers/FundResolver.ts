import { Arg, Ctx, FieldResolver, Float, Info, Int, Resolver, Root } from 'type-graphql';

import { GraphQLContext } from '../context';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { FundInvestmentFilter } from '../inputs/FundInvestment/FundInvestmentFilter';
import { FundInvestmentOrderBy } from '../inputs/FundInvestment/FundInvestmentOrderBy';
import { FundUserProfileFilter } from '../inputs/FundUserProfile/FundUserProfileFilter';
import { FundUserProfileOrderBy } from '../inputs/FundUserProfile/FundUserProfileOrderBy';
import { PendingFundUserFilter } from '../inputs/PendingFundUser/PendingFundUserFilters';
import { PendingFundUserOrderBy } from '../inputs/PendingFundUser/PendingFundUserOrderBy';
import { UserProfileFilter } from '../inputs/UserProfile/UserProfileFilter';
import { UserProfileOrderBy } from '../inputs/UserProfile/UserProfileOrderBy';
import { PendingFundUser, TransactionRecurrence } from '../models';
import { Fund } from '../models/Fund';
import { FundContact } from '../models/FundContact';
import { FundInvestment } from '../models/FundInvestment';
import { FundTransaction } from '../models/FundTransaction';
import { FundType } from '../models/FundType';
import { FundUserProfile } from '../models/FundUserProfile';
import { UserProfile } from '../models/UserProfile';
import { FundRepository } from '../repositories/Fund';

@Resolver(type => Fund)
export class FundResolver extends UtilityResolver {
    // Current Balance
    @FieldResolver(type => Float)
    public async currentBalance(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getCustomRepository(FundRepository);
        return repo.getCurrentBalance(root);
    }

    // Available Balance
    @FieldResolver(type => Float)
    public async availableBalance(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getCustomRepository(FundRepository);
        return repo.getAvailableBalance(root);
    }

    // Pending Balance
    @FieldResolver(type => Float)
    public async pendingBalance(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getCustomRepository(FundRepository);
        return repo.getPendingBalance(root);
    }

    // Total Balance
    @FieldResolver(type => Float)
    public async totalBalance(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getCustomRepository(FundRepository);
        return repo.getTotalBalance(root);
    }

    /**
     * Invested Balance
     * @todo implement complexity
     * @note do not refactor to be called for collection.
     * It's named awkwardly because it is extremely computationally intensive
     * and will crash our server if abused
     */

    @FieldResolver(type => Float, {
        complexity: 100,
        description:
            'This resolver is extremely intensive and intended for 1-time use only. Do NOT call in a loop'
    })
    public async investedBalanceForOneTimeUse(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getCustomRepository(FundRepository);
        return repo.getInvestedBalance(root);
    }

    // Amount pending incoming
    @FieldResolver(type => Float)
    public async amountPendingIncoming(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getCustomRepository(FundRepository);
        return repo.getAmountPendingIncoming(root.id);
    }

    // Amount pending outgoing
    @FieldResolver(type => Float)
    public async amountPendingOutgoing(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getCustomRepository(FundRepository);
        return repo.getAmountPendingOutgoing(root.id);
    }

    // Amount pending outgoing
    @FieldResolver(type => UserProfile)
    public async primaryAccountHolder(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(UserProfile);

        return repo.findOne(root.primaryAccountHolderId);
    }

    // Fund financialAdvisor
    // @FieldResolver(type => UserProfile, { nullable: true })
    // public async financialAdvisor(@Root() root: Fund, @Ctx() context: GraphQLContext) {
    //     const repo = context.typeorm.getRepository(UserProfile);

    //     const builder = repo
    //         .createQueryBuilder('userProfile')
    //         .leftJoin('userProfile.fundUserProfiles', 'fundUserProfile')
    //         .leftJoin('fundUserProfile.fundRole', 'fundRole')
    //         .where('fundUserProfile.fundId = :id AND fundRole.name = :roleName', {
    //             id: root.id,
    //             roleName: FundRoleNameValues.FINANCIAL_ADVISOR
    //         });
    //     const financialAdvisor = await builder.getOne();
    //     return financialAdvisor;
    // }

    // Fund investments
    @FieldResolver(type => [FundInvestment])
    public async investments(
        @Root() root: Fund,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: FundInvestmentOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundInvestmentFilter, {
            nullable: true
        })
        where?: FundInvestmentFilter
    ) {
        const repo = context.typeorm.getRepository(FundInvestment);
        const builder = this.createQuery(repo, { ...where, fundId: root.id }, orderBy, skip, take);
        const result = await builder.getMany();
        return result;
    }

    // Recurrences
    @FieldResolver(type => [TransactionRecurrence])
    public async recurrences(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(TransactionRecurrence);
        if (!root.recurrences) {
            root.recurrences = await repo.find({ fundId: root.id });
        }
        return root.recurrences;
    }

    // All fund contacts
    @FieldResolver(type => [FundContact])
    public async contacts(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(FundContact);
        if (!root.contacts) {
            root.contacts = await repo.find({ fundId: root.id });
        }
        return root.contacts;
    }

    // Primary fund contact
    @FieldResolver(type => FundContact)
    public async contact(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(FundContact);
        if (!root.contact) {
            root.contact = await repo.findOne({ fundId: root.id, isPrimary: true });
        }
        return root.contact;
    }

    // Fund user profiles
    @FieldResolver(type => [PendingFundUser])
    public async pendingFundUsers(
        @Root() root: Fund,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: PendingFundUserOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => PendingFundUserFilter, { nullable: true })
        where?: FundUserProfileFilter
    ) {
        const repo = context.typeorm.getRepository(PendingFundUser);

        const builder = this.createQuery(repo, { ...where, fundId: root.id }, orderBy, skip, take);
        const result = await builder.getMany();
        return result;
    }

    // Fund user profiles
    @FieldResolver(type => [FundUserProfile])
    public async fundUserProfiles(
        @Root() root: Fund,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: FundUserProfileOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundUserProfileFilter, { nullable: true })
        where?: FundUserProfileFilter
    ) {
        const repo = context.typeorm.getRepository(FundUserProfile);

        const builder = this.createQuery(repo, { ...where, fundId: root.id }, orderBy, skip, take);
        const result = await builder.getMany();
        return result;
    }

    // User profiles
    @FieldResolver(type => [UserProfile])
    public async userProfiles(
        @Root() root: Fund,
        @Ctx() context: any,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: UserProfileOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => UserProfileFilter, { nullable: true })
        where?: UserProfileFilter
    ) {
        const repo = context.typeorm.getRepository(UserProfile);
        const builder = repo
            .createQueryBuilder('userProfile')
            .leftJoin('userProfile.fundUserProfiles', 'fundUserProfile')
            .where('fundUserProfile.fundId = :id', { id: root.id });
        const result = await builder.getMany();
        return result;
    }

    // Fund type
    @FieldResolver(type => FundType)
    public async fundType(@Root() root: Fund, @Ctx() context: GraphQLContext, @Info() info: any) {
        if (!root.fundType) {
            root.fundType = await context.typeorm.getRepository(FundType).findOne({
                id: root.fundTypeId
            });
        }
        return root.fundType;
    }

    @FieldResolver(type => UserProfile)
    public async createdByUserProfile(
        @Root() root: Fund,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        if (!root.createdByUserProfile) {
            root.createdByUserProfile = await context.typeorm.getRepository(UserProfile).findOne({
                id: root.createdByUserProfileId
            });
        }
        return root.createdByUserProfile;
    }

    @FieldResolver(type => [FundTransaction])
    public async transactions(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(FundTransaction);
        if (!root.transactions) {
            root.transactions = await repo.find({ fundId: root.id });
        }
        return root.transactions;
    }

    @FieldResolver(type => Boolean)
    public async hasHadRecurringContributions(@Root() root: Fund, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(TransactionRecurrence);
        const query = repo
            .createQueryBuilder('transactionRecurrence')
            .leftJoin('transactionRecurrence.fundTransaction', 'fundTransaction')
            .where('fundTransaction.fundId = :fundId', { fundId: root.id });

        const count = await query.getCount();
        return count > 0;
    }
}
