import {
    Tenant,
    TenantAccount,
    GLAccount,
    PlaidAccount,
    ExpiredPlaidAccount,
    UserProfile
} from '../models';
import { Resolver, FieldResolver, Query, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import camelcaseKeys from 'camelcase-keys';
import { plaidClient } from '../plaid/';

@Resolver(type => TenantAccount)
export class TenantAccountResolver extends UtilityResolver {
    @FieldResolver(type => Tenant)
    public async tenant(@Root() root: TenantAccount, @Ctx() context: any, @Info() info: any) {
        if (!root.tenant) {
            root.tenant = await context.typeorm.getRepository(Tenant).findOne({
                id: root.tenantId
            });
        }
        return root.tenant;
    }

    @FieldResolver(type => [PlaidAccount])
    async accounts(@Root() tenantAccount: TenantAccount): Promise<PlaidAccount[]> {
        const result = await plaidClient.getAccounts(tenantAccount.accessToken);
        return <any>camelcaseKeys(result.accounts);
    }

    @FieldResolver(type => [PlaidAccount])
    async account(@Root() tenantAccount: TenantAccount): Promise<PlaidAccount> {
        if (!tenantAccount.accountId) return null;
        const result = await plaidClient
            .getAccounts(tenantAccount.accessToken, {
                account_ids: [tenantAccount.accountId]
            })
            .catch(error => null); // Return null for this field, if error; UserProfileAccountResolver.expiredAccount will resolve data instead

        return result && result.accounts && result.accounts.length > 0
            ? <any>camelcaseKeys(result.accounts[0])
            : null;
    }

    @FieldResolver(type => [ExpiredPlaidAccount])
    async expiredAccount(@Root() tenantAccount: TenantAccount): Promise<ExpiredPlaidAccount> {
        if (!tenantAccount.accountId) return null;
        return await plaidClient
            .getAccounts(tenantAccount.accessToken, {
                account_ids: [tenantAccount.accountId]
            })
            .then(() => null) // Return null if getAccounts resolves; UserProfileAccountResolver.account will resolve data instead
            .catch(error => ({
                accountId: tenantAccount.accountId,
                institutionId: tenantAccount.institutionId,
                accessToken: tenantAccount.accessToken
            }));
    }
}
