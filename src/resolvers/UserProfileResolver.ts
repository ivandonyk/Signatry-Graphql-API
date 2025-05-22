import { UserProfile } from '../models/UserProfile';
import { UserProfileRole } from '../models/UserProfileRole';
import { Role } from '../models/Role';
import { AppUser } from '../models/AppUser';
import { UserProfileAccount } from '../models/UserProfileAccount';
import { UserProfilePhone } from '../models/UserProfilePhone';
import { UserProfileEmail } from '../models/UserProfileEmail';
import { UserProfileAddress } from '../models/UserProfileAddress';
import { FundUserProfile } from '../models/FundUserProfile';
import { Fund } from '../models/Fund';
import { TenantAccount } from '../models/TenantAccount';
import { Investment } from '../models/Investment';
import { FinancialAdvisor } from '../models/FinancialAdvisor';
import { UserProfileAccountOrderBy } from '../inputs/UserProfileAccount/UserProfileAccountOrderBy';
import { UserProfilePhoneOrderBy } from '../inputs/UserProfile/UserProfilePhoneOrderBy';
import { UserProfileEmailOrderBy } from '../inputs/UserProfile/UserProfileEmailOrderBy';
import { UserProfileAddressOrderBy } from '../inputs/UserProfile/UserProfileAddressOrderBy';
import { FundUserProfileOrderBy } from '../inputs/FundUserProfile/FundUserProfileOrderBy';
import { FundOrderBy } from '../inputs/Fund/FundOrderBy';
import { TenantAccountOrderBy } from '../inputs/TenantAccount/TenantAccountOrderBy';
import { InvestmentOrderBy } from '../inputs/Investment/InvestmentOrderBy';
import { UserProfileAccountFilter } from '../inputs/UserProfileAccount/UserProfileAccountFilter';
import { UserProfilePhoneFilter } from '../inputs/UserProfile/UserProfilePhoneFilter';
import { UserProfileEmailFilter } from '../inputs/UserProfile/UserProfileEmailFilter';
import { UserProfileAddressFilter } from '../inputs/UserProfile/UserProfileAddressFilter';
import { FundUserProfileFilter } from '../inputs/FundUserProfile/FundUserProfileFilter';
import { FundFilter } from '../inputs/Fund/FundFilter';
import { TenantAccountFilter } from '../inputs/TenantAccount/TenantAccountFilter';
import { InvestmentFilter } from '../inputs/Investment/InvestmentFilter';
import { Resolver, FieldResolver, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { FundTransactionOrderBy } from '../inputs/FundTransaction/FundTransactionOrderBy';
import { FundTransaction, Permission } from '../models';
import { FundTransactionFilter } from '../inputs/FundTransaction/FundTransactionFilter';
import { PositionType } from '../models/PositionType';

@Resolver(type => UserProfile)
export class UserProfileResolver extends UtilityResolver {
    @FieldResolver(type => AppUser)
    public async appUser(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        return context.typeorm.getRepository(AppUser).findOne({
            id: root.appUserId
        });
    }

    @FieldResolver(type => [Permission])
    public async permissionList(@Ctx() context: GraphQLContext): Promise<Permission[]> {
        return await this.getPermissionList(context);
    }

    @FieldResolver(type => [UserProfileAccount])
    public async userProfileAccounts(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: UserProfileAccountOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => UserProfileAccountFilter, { nullable: true })
        where?: UserProfileAccountFilter
    ) {
        const repo = context.typeorm.getRepository(UserProfileAccount);
        const builder = this.createQuery(
            repo,
            { ...where, userProfileId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    // All phone numbers
    @FieldResolver(type => [UserProfilePhone])
    public async phones(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: UserProfilePhoneOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => UserProfilePhoneFilter, { nullable: true })
        where?: UserProfilePhoneFilter
    ) {
        const repo = context.typeorm.getRepository(UserProfilePhone);
        const builder = this.createQuery(
            repo,
            { ...where, userProfileId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    // Primary phone number
    @FieldResolver(type => UserProfilePhone)
    public async primaryPhone(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const repo = context.typeorm.getRepository(UserProfilePhone);
        return repo.findOne({ userProfileId: root.id, isPrimary: true });
    }

    // All emails
    @FieldResolver(type => [UserProfileEmail])
    public async emails(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: UserProfileEmailOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => UserProfileEmailFilter, { nullable: true })
        where?: UserProfileEmailFilter
    ) {
        const repo = context.typeorm.getRepository(UserProfileEmail);
        const builder = this.createQuery(
            repo,
            { ...where, userProfileId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    // Primary email
    @FieldResolver(type => UserProfileEmail)
    public async primaryEmail(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const repo = context.typeorm.getRepository(UserProfileEmail);
        return repo.findOne({ userProfileId: root.id, isPrimary: true });
    }

    // All Addresses
    @FieldResolver(type => [UserProfileAddress])
    public async addresses(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: UserProfileAddressOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => UserProfileAddressFilter, { nullable: true })
        where?: UserProfileAddressFilter
    ) {
        const repo = context.typeorm.getRepository(UserProfileAddress);
        const builder = this.createQuery(
            repo,
            { ...where, userProfileId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    // Primary address
    @FieldResolver(type => UserProfileAddress)
    public async primaryAddress(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const repo = context.typeorm.getRepository(UserProfileAddress);
        return repo.findOne({ userProfileId: root.id, isPrimary: true });
    }

    @FieldResolver(type => [FundUserProfile])
    public async fundUserProfiles(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: FundUserProfileOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundUserProfileFilter, { nullable: true })
        where?: FundUserProfileFilter
    ) {
        const repo = context.typeorm.getRepository(FundUserProfile);
        const builder = this.createQuery(
            repo,
            { ...where, userProfileId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    @FieldResolver(type => [Fund])
    public async funds(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: FundOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundFilter, { nullable: true })
        where?: FundFilter
    ) {
        const repo = context.typeorm.getRepository(Fund);
        const builder = repo
            .createQueryBuilder('fund')
            .leftJoin('fund.fundUserProfiles', 'fundUserProfile')
            .where('fundUserProfile.userProfileId = :id', { id: root.id });
        const result = await builder.getMany();
        return result;
    }

    @FieldResolver(type => [Fund])
    public async createdFunds(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: FundOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundFilter, { nullable: true }) where?: FundFilter
    ) {
        const repo = context.typeorm.getRepository(Fund);
        const builder = this.createQuery(
            repo,
            { ...where, createdByUserProfileId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    @FieldResolver(type => [FundTransaction])
    public async createdFundTransactions(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter
    ) {
        const repo = context.typeorm.getRepository(FundTransaction);
        const builder = this.createQuery(
            repo,
            { ...where, userProfileId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    @FieldResolver(type => [TenantAccount])
    public async updatedTenantAccounts(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: TenantAccountOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => TenantAccountFilter, { nullable: true })
        where?: TenantAccountFilter
    ) {
        const repo = context.typeorm.getRepository(TenantAccount);
        const builder = this.createQuery(
            repo,
            { ...where, updatedBy: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    @FieldResolver(type => [Investment])
    public async createdInvestments(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: InvestmentOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => InvestmentFilter, { nullable: true })
        where?: InvestmentFilter
    ) {
        const repo = context.typeorm.getRepository(Investment);
        const builder = this.createQuery(
            repo,
            { ...where, createdBy: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    @FieldResolver(type => [Investment])
    public async updatedInvestments(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: InvestmentOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => InvestmentFilter, { nullable: true })
        where?: InvestmentFilter
    ) {
        const repo = context.typeorm.getRepository(Investment);
        const builder = this.createQuery(
            repo,
            { ...where, updatedBy: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    @FieldResolver(type => [UserProfileRole])
    public async userProfileRole(@Root() root: UserProfile, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(UserProfileRole);
        return repo.findOne({ userProfileId: root.id });
    }

    @FieldResolver(type => Role)
    public async role(@Root() root: UserProfile, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(Role);
        const builder = repo
            .createQueryBuilder('role')
            .leftJoin('role.userProfileRoles', 'userProfileRole')
            .where('userProfileRole.userProfileId = :id', { id: root.id });
        const result = await builder.getOne();
        return result;
    }

    @FieldResolver(type => FinancialAdvisor)
    public async financialAdvisor(@Root() root: UserProfile, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(FinancialAdvisor);
        const builder = repo
            .createQueryBuilder('financialAdvisor')
            .where('financialAdvisor.userProfileId = :id', { id: root.id });
        const result = await builder.getOne();
        return result;
    }

    @FieldResolver(type => PositionType)
    public async positionType(@Root() root: UserProfile, @Ctx() context: GraphQLContext) {
        if (!root.positionTypeId) return null;

        const repo = context.typeorm.getRepository(PositionType);
        return repo.findOne({ id: root.positionTypeId });
    }
}
