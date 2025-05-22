import { Resolver, Query, Arg, Ctx } from 'type-graphql';
import { BaseResolver } from './core/BaseResolver';
import {
    UITenantAccountUnion,
    UITenantPlaidBankAccount,
    ExpiredUITenantPlaidBankAccount
} from '../models/UITenantAccount';
import { TenantAccount } from '../models';
import { GraphQLContext } from '../context';
import { Account, InstitutionWithInstitutionData, GetInstitutionByIdResponse } from 'plaid';
import { plaidClient } from '../plaid';
import { PermissionLock } from '../decorators/permissionDecorator';
import { Permissions } from '../types/permissionsList';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver()
export class UITenantAccountResolver extends BaseResolver {
    @PermissionLock(PermissionAccessType.ADMIN_BANK_ACCOUNTS, PermissionAccessLevel.READ)
    @Query(() => [UITenantAccountUnion])
    async getUITenantAccounts(
        @Ctx() { typeorm }: GraphQLContext
    ): Promise<Array<typeof UITenantAccountUnion>> {
        const { manager } = typeorm;

        const tenantAccountsRepo = manager.getRepository(TenantAccount);
        const allTenantAccounts = await tenantAccountsRepo.find();

        // Create { [accessToken]: TenantAccount} dictionary to look up Plaid Accounts and Institutions; this weeds out duplicates to limit the number of API calls
        const accessTokens = allTenantAccounts.reduce(
            (acc: { [key: string]: TenantAccount }, current: TenantAccount) => {
                if (!acc[current.accessToken]) acc[current.accessToken] = current; // only add to the dictionary if accessToken not yet seen
                return acc;
            },
            {}
        );

        // The Accounts requests below are where it's discovered that the Plaid Item has gone unauthenticated with the ITEM_LOGIN_REQUIRED error; keep record of the expired accessTokens
        // E.g. { [accessToken]: true }
        const expiredAccountsDict: { [key: string]: boolean } = {};

        // Create { [accessToken]: Account } and { [institutionId]: Institution } dictionaries with the Plaid results in order to easily join the values from the two queries to the TenantAccount (done within the same loop)
        const institutionsDict: { [key: string]: InstitutionWithInstitutionData } = {};

        // Build the above dictionaries with one sequential async loop
        const accountsDict: { [key: string]: Account } = await Object.keys(accessTokens).reduce(
            async (accumulator: Promise<typeof accountsDict>, current: string) => {
                const dict = await accumulator;

                const [accountsResponse, { institution }] = await Promise.all([
                    plaidClient.getAccounts(current).catch(error => {
                        // Handle 'ITEM_LOGIN_REQUIRED' errors by adding the id to the expiredAccountsDict
                        if (error.error_code === 'ITEM_LOGIN_REQUIRED') {
                            expiredAccountsDict[current] = true;
                        } else {
                            throw error;
                        }
                    }),
                    (plaidClient.getInstitutionById(accessTokens[current].institutionId, {
                        include_optional_metadata: true // Get the Plaid Institution color, logo, name
                    }) as Promise<
                        GetInstitutionByIdResponse<InstitutionWithInstitutionData> // type assert which Plaid method overload we're using -- we want the color, logo, etc.
                    >).catch(error => {
                        throw error;
                    })
                ]);

                // If the Plaid Accounts response didn't reject
                if (accountsResponse) {
                    // Because Plaid will return all of the accounts on an Item, get the relavent one from the response, and assign the resolved Account object to the accountsDict
                    dict[current] = accountsResponse.accounts.find((plaidAccount: Account) =>
                        allTenantAccounts.some(
                            userProfileAccount =>
                                plaidAccount.account_id === userProfileAccount.accountId
                        )
                    );
                }

                // Assign the resolved institution object to the institutionId, for cross-reference against the TenantAccount.institutionId
                institutionsDict[accessTokens[current].institutionId] = institution;

                return dict;
            },
            Promise.resolve({})
        );

        // With dictionaries in place where we can access data for each TenantAccount, merge the data together into the response type(s)
        return allTenantAccounts.map(upa => {
            // If the expired dict contains the TenantAccount.accessToken, it's expired; join the institution data and return a UIExpiredBankAccount for this iteration
            if (expiredAccountsDict[upa.accessToken]) {
                const uiExpiredAcct = new ExpiredUITenantPlaidBankAccount();

                // Join what data we have from the db with the institution data
                uiExpiredAcct.tenantAccountId = upa.id;
                uiExpiredAcct.accessToken = upa.accessToken;

                uiExpiredAcct.institutionName = institutionsDict[upa.institutionId].name;
                uiExpiredAcct.institutionLogo = institutionsDict[upa.institutionId].logo;
                uiExpiredAcct.institutionColor = institutionsDict[upa.institutionId].primary_color;

                return uiExpiredAcct;
            }

            const uiAccount = new UITenantPlaidBankAccount();

            // Join the TenantAccount, Plaid Account, and Plaid Institution data
            uiAccount.tenantAccountId = upa.id;

            uiAccount.accountName = accountsDict[upa.accessToken].name;
            uiAccount.accountOfficialName = accountsDict[upa.accessToken].official_name;
            uiAccount.type = accountsDict[upa.accessToken].type;
            uiAccount.subtype = accountsDict[upa.accessToken].subtype;
            uiAccount.mask = accountsDict[upa.accessToken].mask;

            uiAccount.institutionName = institutionsDict[upa.institutionId].name;
            uiAccount.institutionLogo = institutionsDict[upa.institutionId].logo;
            uiAccount.institutionColor = institutionsDict[upa.institutionId].primary_color;

            return uiAccount;
        });
    }
}
