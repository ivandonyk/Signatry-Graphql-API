import { Resolver, Query, Root, Arg, Info, Int, Mutation, Ctx } from 'type-graphql';
import { GraphQLContext } from '../context';
import { UtilityResolver } from './core/UtilityResolver';
import { TenantAccount } from '../models';
import { TenantAccountOrderBy } from '../inputs/TenantAccount/TenantAccountOrderBy';
import { TenantAccountFilter } from '../inputs/TenantAccount/TenantAccountFilter';
import { CreateTenantAccountInput } from '../inputs/TenantAccount/CreateTenantAccountInput';
import { plaidClient } from '../plaid/';
import { EMPTY_UUID } from '../migrations/1576013918229-initTenant';
import { PermissionLock } from '../decorators/permissionDecorator';
import { Permissions } from '../types/permissionsList';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver(type => TenantAccount)
export class TenantAccountResolver extends UtilityResolver {
    @Query(type => [TenantAccount])
    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    public async tenantAccounts(
        @Root() root: TenantAccount,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: TenantAccountOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => TenantAccountFilter, { nullable: true })
        where?: TenantAccountFilter
    ): Promise<TenantAccount[]> {
        const repo = context.typeorm.getRepository(TenantAccount);
        const query = this.createQuery(repo, where, orderBy, skip, take);
        const result = await query.getMany();
        return result;
    }

    @Query(type => Int)
    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    public async tenantAccountsCount(
        @Root() root: TenantAccount,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('where', type => TenantAccountFilter, { nullable: true })
        where?: TenantAccountFilter
    ): Promise<number> {
        const repo = context.typeorm.getRepository(TenantAccount);
        const query = this.createQuery(repo, where);
        const result = await query.getCount();
        return result;
    }

    @Mutation(type => Boolean)
    async deleteTenantAccount(
        @Ctx() context: GraphQLContext,
        @Arg('tenantAccountId') tenantAccountId: string
    ) {
        const result = await context.typeorm
            .createQueryBuilder()
            .delete()
            .from(TenantAccount)
            .where('id = :id', { id: tenantAccountId })
            .execute();
        return result.affected > 0;
    }

    @Mutation(type => TenantAccount, {
        description:
            'Attach a new Plaid Item to the tenant for this installation. This action may only be performed an administrator.'
    })
    async createTenantAccount(
        @Ctx() context: GraphQLContext,
        @Arg('publicToken') publicToken: string,
        @Arg('input') input: CreateTenantAccountInput
    ) {
        const tokenResponse = await plaidClient.exchangePublicToken(publicToken);
        const itemResponse = await plaidClient.getItem(tokenResponse.access_token);
        const { accounts } = await plaidClient.getAccounts(tokenResponse.access_token);
        const account = accounts.find(a => a.account_id == input.accountId);
        const { institution } = await plaidClient.getInstitutionById(
            itemResponse.item.institution_id
        );

        const item = context.typeorm.manager.create(TenantAccount, {
            tenantId: EMPTY_UUID,
            ...input,
            itemId: tokenResponse.item_id,
            accessToken: tokenResponse.access_token,
            institutionId: itemResponse.item.institution_id,
            mask: account.mask,
            name: account.name,
            institutionName: institution.name
        });

        await context.typeorm.manager.insert(TenantAccount, item);

        return item;
    }

    @Mutation(type => Boolean, {
        description:
            'When an unlinked plaid account is relinked, ensure it is not a duplicate of an already existing activated account by removing the duplicate'
    })
    async processDuplicateTenantPlaidItems(
        @Ctx() context: GraphQLContext,
        @Arg('publicToken') publicToken: string
    ): Promise<boolean> {
        const tokenResponse = await plaidClient.exchangePublicToken(publicToken);
        const { item } = await plaidClient.getItem(tokenResponse.access_token);

        const { institution_id, item_id } = item;
        const potentialDuplicates = await context.typeorm
            .createQueryBuilder(TenantAccount, 'ta')
            .where('ta.institution_id = :id', { id: institution_id })
            .andWhere('ta.tenant_id = :taid', { taid: EMPTY_UUID })
            .getMany();

        const accounts = await Promise.all(
            potentialDuplicates.map(async account => {
                return await plaidClient.getAccounts(account.accessToken, {
                    account_ids: [account.accountId]
                });
            })
        );

        const newItemIndex: number = potentialDuplicates.findIndex(upa => upa.itemId === item_id);

        const {
            accounts: [freshAccount]
        } = accounts[newItemIndex];

        const duplicates: boolean = accounts.some((account, index) => {
            const {
                accounts: [acc]
            } = account;
            return (
                acc.mask === freshAccount.mask &&
                acc.subtype === freshAccount.subtype &&
                index !== newItemIndex
            );
        });

        if (duplicates) {
            await this.deleteTenantAccount(context, potentialDuplicates[newItemIndex].id);
        }

        return duplicates;
    }
}
