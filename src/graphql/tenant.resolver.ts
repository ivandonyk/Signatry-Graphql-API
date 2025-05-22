import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql';
import { InvestmentUnitPriceHistory, Tenant, UserProfile, GLAccount } from '../models';
import { InvestmentUnitPriceHistoryInput } from '../inputs/InvestmentUnitPriceHistory/InvestmentUnitPriceHistoryInput';
import { BaseResolver } from './core/BaseResolver';
import { GraphQLContext } from '../context';
import { EntityManager } from 'typeorm';
import { PermissionLock } from '../decorators/permissionDecorator';
import { TenantPurposeNotesCategorySettingsInput } from '../inputs/TenantSettings/TenantPurposeNotesCategorySettingsInput';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { GLAccountRepository } from '../repositories/GLAccount';
import { GLAccountTypeName } from '../models/GLAccountType';

@Resolver()
export class TenantResolver extends BaseResolver {
    @Query(type => Tenant, { nullable: false })
    async tenant(@Ctx() context: GraphQLContext): Promise<Tenant> {
        return await context.typeorm.getRepository(Tenant).findOne();
    }

    @Query(type => GLAccount, {
        description: 'Gets all InsitutionAccounts that match specified parameters'
    })
    public async getTenantGrantAccount(@Ctx() context: GraphQLContext): Promise<GLAccount> {
        const glAccountRepo = context.typeorm.manager.getCustomRepository(GLAccountRepository);
        return await glAccountRepo.getByType(GLAccountTypeName.GRANT_DISBURSEMENT);
    }

    // Commented since these aren't really used anyway
    // Maybe a new permission in the future?
    // @PermissionLock(Permissions.ADMIN_DEFAULTS)
    @Mutation(type => Tenant, { nullable: false })
    async setTenantEmail(
        @Ctx() context: GraphQLContext,
        @Arg('email') email: string
    ): Promise<Tenant> {
        const tenant = await context.typeorm.manager.findOne(Tenant);
        tenant.appSetting.email = email;
        await context.typeorm.manager.save(tenant);
        return tenant;
    }

    // @PermissionLock(Permissions.ADMIN_DEFAULTS)
    @Mutation(type => Tenant, { nullable: false })
    async setTenantFromEmail(
        @Ctx() context: GraphQLContext,
        @Arg('fromEmail') fromEmail: string
    ): Promise<Tenant> {
        const tenant = await context.typeorm.manager.findOne(Tenant);
        tenant.appSetting.fromEmail = fromEmail;
        await context.typeorm.manager.save(tenant);
        return tenant;
    }

    // @PermissionLock(Permissions.ADMIN_DEFAULTS)
    @Mutation(type => Tenant, { nullable: false })
    async setTenantGrantPurposeCategories(
        @Ctx() context: GraphQLContext,
        @Arg('purposeCategories', type => [TenantPurposeNotesCategorySettingsInput])
        purposeCategories: TenantPurposeNotesCategorySettingsInput[]
    ): Promise<Tenant> {
        const tenant = await context.typeorm.manager.findOne(Tenant);
        tenant.appSetting.purposeCategories = purposeCategories;
        await context.typeorm.manager.save(tenant);
        return tenant;
    }

    // @PermissionLock(Permissions.ADMIN_DEFAULTS)
    @Mutation(type => Tenant, { nullable: false })
    async setTenantSpecialRecognitionCategories(
        @Ctx() context: GraphQLContext,
        @Arg('specialRecognitionCategories', type => [String])
        specialRecognitionCategories: string[]
    ): Promise<Tenant> {
        const tenant = await context.typeorm.manager.findOne(Tenant);
        tenant.appSetting.specialRecognitionCategories = specialRecognitionCategories;
        await context.typeorm.manager.save(tenant);
        return tenant;
    }

    async saveInvestmentUnitPrice(
        profile: UserProfile,
        dbTransaction: EntityManager,
        input: InvestmentUnitPriceHistoryInput
    ) {
        const current = dbTransaction.create(InvestmentUnitPriceHistory, input);
        const previous = await dbTransaction.findOne(InvestmentUnitPriceHistory, null, {
            where: { investmentId: input.investmentId },
            order: { createdOn: 'DESC' }
        });
        current.previousPrice = previous ? previous.closePrice : null;
        current.createdBy = profile.id;
        current.updatedBy = profile.id;
        await dbTransaction.save(current);
        return current;
    }

    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.FULL)
    @Mutation(type => [InvestmentUnitPriceHistory])
    async saveInvestmentUnitPrices(
        @Ctx() context: GraphQLContext,
        @Arg('inputs', type => InvestmentUnitPriceHistoryInput)
        inputs: InvestmentUnitPriceHistoryInput[]
    ): Promise<InvestmentUnitPriceHistory[]> {
        const manager = context.typeorm.manager;
        const profile = await this.getCurrentUserProfile(context);

        return await manager.transaction(async dbTransaction => {
            // set investment unit prices from inputs
            const result = await Promise.all(
                inputs.map(async i => await this.saveInvestmentUnitPrice(profile, dbTransaction, i))
            );

            return result;
        });
    }
}
