import { UserProfileAccount } from '../models/UserProfileAccount';
import { PlaidAccount, ExpiredPlaidAccount, TransactionRecurrence } from '../models';
import { UIStripeCard } from '../models/UIFundingSource';
import { UserProfile } from '../models/UserProfile';
import { Resolver, FieldResolver, Ctx, Root, Info } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import camelcaseKeys from 'camelcase-keys';
import { plaidClient } from '../plaid';
import { getStripeClient } from '../stripe';
import Stripe from 'stripe';

@Resolver(type => UserProfileAccount)
export class UserProfileAccountResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async userProfile(
        @Root() root: UserProfileAccount,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const temp = await context.typeorm.getRepository(UserProfile).findOne({
            id: root.userProfileId
        });
        return temp;
    }

    @FieldResolver(type => [PlaidAccount])
    async accounts(@Root() userProfileAccount: UserProfileAccount): Promise<PlaidAccount[]> {
        const result = await plaidClient.getAccounts(userProfileAccount.accessToken);
        return <any>camelcaseKeys(result.accounts);
    }

    @FieldResolver(type => [PlaidAccount])
    async account(@Root() userProfileAccount: UserProfileAccount): Promise<PlaidAccount> {
        if (!userProfileAccount.accountId) return null;
        const result = await plaidClient
            .getAccounts(userProfileAccount.accessToken, {
                account_ids: [userProfileAccount.accountId]
            })
            .catch(error => null); // Return null for this field, if error; UserProfileAccountResolver.expiredAccount will resolve data instead

        return result && result.accounts && result.accounts.length > 0
            ? <any>camelcaseKeys(result.accounts[0])
            : null;
    }

    @FieldResolver(type => [ExpiredPlaidAccount])
    async expiredAccount(
        @Root() userProfileAccount: UserProfileAccount
    ): Promise<ExpiredPlaidAccount> {
        if (!userProfileAccount.accountId) return null;
        return await plaidClient
            .getAccounts(userProfileAccount.accessToken, {
                account_ids: [userProfileAccount.accountId]
            })
            .then(() => null) // Return null if getAccounts resolves; UserProfileAccountResolver.account will resolve data instead
            .catch(error => ({
                accountId: userProfileAccount.accountId,
                institutionId: userProfileAccount.institutionId,
                accessToken: userProfileAccount.accessToken
            }));
    }

    @FieldResolver(type => TransactionRecurrence)
    public async transactionRecurrence(
        @Root() root: UserProfileAccount,
        @Ctx() context: GraphQLContext
    ) {
        return context.typeorm.getRepository(TransactionRecurrence).findOne({
            userProfileAccountId: root.id
        });
    }

    @FieldResolver(type => UIStripeCard)
    async card(
        @Ctx() { typeorm }: GraphQLContext,
        @Root() userProfileAccount: UserProfileAccount
    ): Promise<UIStripeCard> {
        if (!userProfileAccount.paymentMethodId) return null;
        const stripeClient = getStripeClient();

        // Get the UserProfile associated witht the account, so that we can use the Stripe customer id to query the card info
        const userProfile = await typeorm.manager
            .getRepository(UserProfile)
            .findOne(userProfileAccount.userProfileId);
        const card = (await stripeClient.customers.retrieveSource(
            userProfile.customerId,
            userProfileAccount.paymentMethodId
        )) as Stripe.Card;
        return {
            brand: card.brand,
            last4: card.last4,
            expMonth: card.exp_month,
            expYear: card.exp_month,
            isPrimary: userProfileAccount.isPrimary,
            userProfileAccountId: userProfileAccount.id,
            paymentMethodId: userProfileAccount.paymentMethodId
        };
    }
}
