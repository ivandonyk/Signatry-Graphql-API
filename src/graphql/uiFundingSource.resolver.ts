import { Resolver, Query, Arg, Ctx } from 'type-graphql';
import { EntityManager } from 'typeorm';
import {
    UIFundingSourceUnion,
    UIPlaidBankAccount,
    ExpiredUIPlaidBankAccount,
    UIStripeCard
} from '../models/UIFundingSource';
import { UserProfileAccount, UserProfile } from '../models';
import { UserProfileAccountTypes } from '../models/UserProfileAccount';
import { GraphQLContext } from '../context';
import { Account, InstitutionWithInstitutionData, GetInstitutionByIdResponse } from 'plaid';
import { plaidClient } from '../plaid';
import { getStripeClient } from '../stripe';
import { getOrCreateStripeCustomer } from '../utilities/getOrCreateStripeCustomer';
import Stripe from 'stripe';

@Resolver()
export class UIFundingSourceResolver {
    @Query(() => [UIFundingSourceUnion])
    async getUIFundingSourcesForUser(
        @Arg('userProfileId') userProfileId: string,
        @Ctx() { typeorm }: GraphQLContext
    ): Promise<Array<typeof UIFundingSourceUnion>> {
        const { manager } = typeorm;

        const userProfileRepo = manager.getRepository(UserProfile);
        const userProfile = await userProfileRepo.findOne(userProfileId);

        if (!userProfile) {
            throw new Error('UserProfile at the provided id could not be found');
        }

        const userAccountRepo = manager.getRepository(UserProfileAccount);
        const userProfileAccounts = await userAccountRepo.find({
            where: { userProfileId },
            order: { createdOn: 'ASC' as 'ASC' }
        });

        // Sort the UserProfileAccounts into their respective types; after querying Plaid and Stripe for the details of each, these arrays will be joined as the UIFundingSourceUnion[] return type
        const plaidBankAccounts: UserProfileAccount[] = []; // (potentially expired)
        const stripeCreditCards: UserProfileAccount[] = [];
        userProfileAccounts.forEach(account => {
            switch (account.accountType) {
                case UserProfileAccountTypes.BANK_ACCOUNT:
                    plaidBankAccounts.push(account);
                    break;
                case UserProfileAccountTypes.CREDIT_CARD:
                    stripeCreditCards.push(account);
                    break;
                default:
                    throw new Error(`Recieved unexpected accountType ${account.accountType}`);
            }
        });

        let uiPlaidAccountsPromise:
            | Promise<(UIPlaidBankAccount | ExpiredUIPlaidBankAccount)[]>
            | undefined;
        let uiStripeCardsPromise: Promise<UIStripeCard[]> | undefined;

        // Prevent API calls to Plaid if no Plaid UserProfileAccounts
        if (plaidBankAccounts.length > 0) {
            uiPlaidAccountsPromise = this.generateUIPlaidBankAccounts(plaidBankAccounts);
        }

        // Prevent API calls and Customer creation in Stripe if no Stripe UserProfileAccounts
        if (stripeCreditCards.length > 0) {
            uiStripeCardsPromise = this.generateUIStripeCards(
                stripeCreditCards,
                userProfile,
                manager
            );
        }

        return await Promise.all([
            ...(!!uiPlaidAccountsPromise ? await uiPlaidAccountsPromise : []),
            ...(uiStripeCardsPromise ? await uiStripeCardsPromise : [])
        ]);
    }

    /**
     * Queries both Plaid Accounts and Institutions endpoints to return UIPlaidBankAccounts,
     * and if any of the Account queries fail with an 'ITEM_LOGIN_REQUIRED' error, an
     * ExpiredUIPlaidBankAccount is returned.
     *
     * @param bankUserProfileAccounts
     */
    private async generateUIPlaidBankAccounts(
        bankUserProfileAccounts: UserProfileAccount[]
    ): Promise<(UIPlaidBankAccount | ExpiredUIPlaidBankAccount)[]> {
        // Create { [accessToken]: UserProfileAccount} dictionary to look up Plaid Accounts and Institutions; this weeds out duplicates to limit the number of API calls
        const accessTokens = bankUserProfileAccounts.reduce(
            (acc: { [key: string]: UserProfileAccount }, current: UserProfileAccount) => {
                if (!acc[current.accessToken]) acc[current.accessToken] = current;
                return acc;
            },
            {}
        );

        // The Accounts requests below are where it's discovered that the Plaid Item has gone unauthenticated with the ITEM_LOGIN_REQUIRED error; keep record of the expired accessTokens
        // E.g. { [accessToken]: true }
        const expiredAccountsDict: { [key: string]: boolean } = {};

        // Create { [accessToken]: Account } and { [institutionId]: Institution } dictionaries with the Plaid results in order to easily join the values from the two queries to the UserProfileAccount (done within the same loop)
        const institutionsDict: { [key: string]: InstitutionWithInstitutionData } = {};

        // Build the above dictionaries with one sequential async loop
        const accountsDict: { [key: string]: Account } = await Object.keys(accessTokens).reduce(
            async (accumulator: Promise<typeof accountsDict>, current: string) => {
                const dict = await accumulator;

                let accountsResponse;
                let institution;

                const resp = await Promise.all([
                    plaidClient.getAccounts(current).catch(error => {
                        // Handle 'ITEM_LOGIN_REQUIRED' errors by pushing the accessible values to the above Pick[]
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
                ]).catch(err => console.error(err));

                if (resp) {
                    [accountsResponse, { institution }] = resp;
                    // If the Plaid Accounts response didn't reject
                    if (accountsResponse) {
                        // Because Plaid will return all of the accounts on an Item, get the relavent one from the response, and assign the resolved Account object to the accountsDict
                        dict[current] = accountsResponse.accounts.find((plaidAccount: Account) =>
                            bankUserProfileAccounts.some(
                                userProfileAccount =>
                                    plaidAccount.account_id === userProfileAccount.accountId
                            )
                        );
                    }

                    // Assign the resolved institution object to the institutionId, for cross-reference against the UserProfileAccount.institutionId
                    institutionsDict[accessTokens[current].institutionId] = institution;
                }

                return dict;
            },
            Promise.resolve({})
        );

        // With dictionaries in place where we can access data for each UserProfileAccount, merge the data together into the response type(s)
        const dictArr = [];
        bankUserProfileAccounts.forEach(upa => {
            // If the expired dict contains the UserProfileAccount.accessToken, it's expired; join the institution data and return a UIExpiredBankAccount for this iteration
            if (expiredAccountsDict[upa.accessToken]) {
                const uiExpiredAcct = new ExpiredUIPlaidBankAccount();

                // Join what data we have from the db with the institution data
                uiExpiredAcct.userProfileAccountId = upa.id;
                uiExpiredAcct.isPrimary = upa.isPrimary;
                uiExpiredAcct.accessToken = upa.accessToken;

                uiExpiredAcct.institutionName = institutionsDict[upa.institutionId].name;
                uiExpiredAcct.institutionLogo = institutionsDict[upa.institutionId].logo;
                uiExpiredAcct.institutionColor = institutionsDict[upa.institutionId].primary_color;

                return dictArr.push(uiExpiredAcct);
            }

            if (accountsDict[upa.accessToken] && institutionsDict[upa.institutionId]) {
                const uiAccount = new UIPlaidBankAccount();

                // Join the UserProfileAccount, Plaid Account, and Plaid Institution data
                uiAccount.userProfileAccountId = upa.id;
                uiAccount.isPrimary = upa.isPrimary;

                uiAccount.accountName = accountsDict[upa.accessToken].name;
                uiAccount.accountOfficialName = accountsDict[upa.accessToken].official_name;
                uiAccount.type = accountsDict[upa.accessToken].type;
                uiAccount.subtype = accountsDict[upa.accessToken].subtype;
                uiAccount.mask = accountsDict[upa.accessToken].mask;
                uiAccount.balances = accountsDict[upa.accessToken].balances;

                uiAccount.institutionName = institutionsDict[upa.institutionId].name;
                uiAccount.institutionLogo = institutionsDict[upa.institutionId].logo;
                uiAccount.institutionColor = institutionsDict[upa.institutionId].primary_color;

                return dictArr.push(uiAccount);
            }
        });

        return dictArr;
    }

    /**
     * Queries Stripe for PaymentMethods attached to the Stripe Customer object
     *
     * @param cardUserProfileAccounts
     * @param userProfile
     * @param manager
     */
    private async generateUIStripeCards(
        cardUserProfileAccounts: UserProfileAccount[],
        userProfile: UserProfile,
        manager: EntityManager
    ): Promise<UIStripeCard[]> {
        const stripeClient = getStripeClient();

        return await cardUserProfileAccounts.reduce(async (acc, current) => {
            const cards = await acc;
            const card = (await stripeClient.customers.retrieveSource(
                userProfile.customerId,
                current.paymentMethodId
            )) as Stripe.Card;
            cards.push({
                createdOn: current.createdOn,
                userProfileAccountId: current.id,
                isPrimary: current.isPrimary,
                paymentMethodId: current.paymentMethodId,
                brand: card.brand,
                expMonth: card.exp_month,
                expYear: card.exp_year,
                last4: card.last4
            });
            return cards;
        }, Promise.resolve([]));
    }
}
