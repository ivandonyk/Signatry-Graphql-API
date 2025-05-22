import { Resolver, Root, Arg, Info, Query, Mutation, Int, Ctx } from 'type-graphql';
import { plaidClient } from '../plaid';
import { UserProfile } from '../models/UserProfile';
import { UserProfileAccount, UserProfileAccountTypes } from '../models/UserProfileAccount';
import { GraphQLContext } from '../context';
import { UtilityResolver } from './core/UtilityResolver';
import { CreateUserProfileAccountInput } from '../inputs/UserProfile/CreateUserProfileAccountInput';
import { PermissionLock } from '../decorators/permissionDecorator';
import { UserProfileAccountOrderBy } from '../inputs/UserProfileAccount/UserProfileAccountOrderBy';
import { UserProfileAccountFilter } from '../inputs/UserProfileAccount/UserProfileAccountFilter';
import { getStripeClient } from '../stripe';
import Stripe from 'stripe';
import NotPermittedError from '../errors/NotPermitted';
import { AccountTypes, largeIdentify, newAccountAdded } from '../utilities/segmentConfig';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver(type => UserProfileAccount)
export class UserProfileAccountResolver extends UtilityResolver {
    @Query(type => [UserProfileAccount])
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    public async userProfileAccounts(
        @Root() root: UserProfileAccount,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: UserProfileAccountOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => UserProfileAccountFilter, { nullable: true })
        where?: UserProfileAccountFilter
    ): Promise<UserProfileAccount[]> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const repo = context.typeorm.getRepository(UserProfileAccount);
        const query = this.createQuery(
            repo,
            { ...where, userProfileId: profile.id },
            orderBy,
            skip,
            take
        );
        const result = await query.getMany();
        return result;
    }

    @Query(type => Int)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    public async userProfileAccountsCount(
        @Root() root: UserProfileAccount,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('where', type => UserProfileAccountFilter, { nullable: true })
        where?: UserProfileAccountFilter
    ): Promise<number> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const repo = context.typeorm.getRepository(UserProfileAccount);
        const query = this.createQuery(repo, { ...where, userProfileId: profile.id });
        const result = await query.getCount();
        return result;
    }

    @Mutation(type => Boolean)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    async deleteUserProfileAccount(
        @Ctx() context: GraphQLContext,
        @Arg('userProfileAccountId') userProfileAccountId: string
    ) {
        const { profile: requestingUserProfile } = await this.getPotentiallyImpersonatedProfile(
            context
        );
        const requestingUserPermissions = await this.getPermissionList(context);

        // Get the UserProfile to which the UserProfileAccount belongs
        const userProfileAccount = await context.typeorm
            .createQueryBuilder(UserProfileAccount, 'userProfileAccount')
            .leftJoinAndSelect('userProfileAccount.userProfile', 'userProfile')
            .where('userProfileAccount.id = :userProfileAccountId', { userProfileAccountId })
            .getOne();

        if (
            userProfileAccount.userProfileId !== requestingUserProfile.id &&
            !requestingUserPermissions.some(
                permission =>
                    permission.accessType === PermissionAccessType.ADMIN_USER_MANAGEMENT &&
                    permission.accessLevel === PermissionAccessLevel.FULL
            )
        )
            throw new NotPermittedError(
                `You do not have permissions to delete user profile account ${userProfileAccountId}`
            );

        if (userProfileAccount.userProfile.customerId) {
            const stripeClient = getStripeClient();

            // retrieve stripe customer
            const stripeCustomer: Stripe.Customer = (await stripeClient.customers.retrieve(
                userProfileAccount.userProfile.customerId,
                { expand: ['sources'] }
            )) as Stripe.Customer;

            if (userProfileAccount.accountType === UserProfileAccountTypes.BANK_ACCOUNT) {
                // find stripe customer payment source matching userProfileAccount
                const sources = stripeCustomer?.sources.data as Stripe.BankAccount[];
                const stripeSource: Stripe.BankAccount = sources.find(
                    source =>
                        source.metadata.plaidItemId === userProfileAccount.itemId &&
                        source.metadata.plaidAccountId === userProfileAccount.accountId
                ) as Stripe.BankAccount;
                if (stripeSource) {
                    await stripeClient.customers.deleteSource(stripeCustomer.id, stripeSource.id);
                }
            }

            if (userProfileAccount.accountType === UserProfileAccountTypes.CREDIT_CARD) {
                // Find the Stripe customer payment source matching the paymentMethodId
                const sources = stripeCustomer?.sources.data as Stripe.Card[];
                const stripeSource: Stripe.Card = sources.find(
                    source => source.id === userProfileAccount.paymentMethodId
                );

                if (stripeSource) {
                    await stripeClient.customers.deleteSource(stripeCustomer.id, stripeSource.id);
                }
            }
        }

        const result = await context.typeorm
            .createQueryBuilder()
            .delete()
            .from(UserProfileAccount)
            .where('id = :id', { id: userProfileAccountId })
            .andWhere('userProfileId = :profileId', {
                profileId: userProfileAccount.userProfileId
            })
            .execute();
        return result.affected > 0;
    }

    @Mutation(type => UserProfileAccount, {
        description: 'Attach a new Plaid Item to the currently logged in user profile.'
    })
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    async createUserProfileAccount(
        @Ctx() context: GraphQLContext,
        @Arg('publicToken') publicToken: string,
        @Arg('input') input: CreateUserProfileAccountInput
    ): Promise<UserProfileAccount> {
        const { manager } = context.typeorm;
        const userProfile = await manager
            .getRepository(UserProfile)
            .createQueryBuilder('userProfile')
            .leftJoinAndSelect('userProfile.appUser', 'appUser')
            .where('userProfile.id = :id', { id: input.userProfileId })
            .getOne();

        if (!userProfile)
            throw new Error(`Unable to find userProfile with id ${input.userProfileId}`);

        const tokenResponse = await plaidClient.exchangePublicToken(publicToken);

        const [itemResponse, accountsResponse] = await Promise.all([
            plaidClient.getItem(tokenResponse.access_token),
            plaidClient.getAccounts(tokenResponse.access_token)
        ]);

        const userProfileAccounts = await manager
            .getRepository(UserProfileAccount)
            .find({ userProfileId: userProfile.id });
        const isPrimary = !userProfileAccounts.length;

        const item = manager.create(UserProfileAccount, {
            userProfileId: userProfile.id,
            ...input,
            itemId: tokenResponse.item_id,
            accessToken: tokenResponse.access_token,
            institutionId: itemResponse.item.institution_id,
            isPrimary
        });

        await context.typeorm.manager.insert(UserProfileAccount, item);

        // for email notification
        const { institution } = await plaidClient.getInstitutionById(
            itemResponse.item.institution_id
        );
        const institutionName = institution.name;
        const account = accountsResponse.accounts.find(a => a.account_id === input.accountId);
        const accountType = `${account.subtype[0].toUpperCase()}${account.subtype.slice(1)}`;

        await Promise.all([
            newAccountAdded(manager, userProfile.id, AccountTypes.BANK_ACCOUNT),
            // send email notification
            context.email.sendAddedNewFundingSourceNotification(
                manager,
                context.user.email,
                institutionName,
                accountType
            )
        ]);

        largeIdentify(manager, userProfile.id);

        return item;
    }

    @Mutation(type => String, {
        description:
            'Exchange an access_token for a temporary (30 min) public_token required to open Plaid Link on the client in Update Mode.'
    })
    async generatePlaidPublicToken(@Arg('accessToken') accessToken: string): Promise<string> {
        return (await plaidClient.createPublicToken(accessToken)).public_token;
    }

    @Mutation(type => Boolean, {
        description:
            'When an unlinked plaid account is relinked, ensure it is not a duplicate of an already existing activated account by removing the duplicate'
    })
    async processDuplicatePlaidItems(
        @Ctx() context: GraphQLContext,
        @Arg('publicToken') publicToken: string
    ): Promise<boolean> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        const tokenResponse = await plaidClient.exchangePublicToken(publicToken);
        const { item } = await plaidClient.getItem(tokenResponse.access_token);

        const { institution_id, item_id } = item;
        const potentialDuplicates = await context.typeorm
            .createQueryBuilder(UserProfileAccount, 'upa')
            .where('upa.institution_id = :id', { id: institution_id })
            .andWhere('upa.user_profile_id = :upaid', { upaid: profile.id })
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
            await this.deleteUserProfileAccount(context, potentialDuplicates[newItemIndex].id);
        }

        return duplicates;
    }

    /**
     * Sandbox-only Plaid Environment trigger method
     * @description Triggers an ITEM_LOGIN_REQUIRED authentication error state for a PlaidItem with the provided accessToken
     * to simulate a user's credential change at an institution, which would prevent Plaid from authenticating and getting that
     * user's account details.
     *
     * @param accessToken (accessible at UserProfileAccount.accessToken)
     */
    @Mutation(type => Boolean)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    async triggerItemLoginRequired(
        @Ctx() context: GraphQLContext,
        @Arg('accessToken') accessToken: string
    ): Promise<boolean> {
        const resetResponse = await plaidClient.resetLogin(accessToken);
        return resetResponse ? true : false;
    }

    @Mutation(type => UserProfileAccount)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    async setDefaultUserProfileAccount(
        @Ctx() context: GraphQLContext,
        @Arg('userProfileAccountId') userProfileAccountId: string
    ): Promise<UserProfileAccount> {
        const manager = context.typeorm.manager;
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const permissions = await this.getPermissionList(context);

        // Start a transaction because two db operations must be successful for this to work
        return await manager.transaction(async transactionManager => {
            // Ensure the user owns the UserProfileAccount being updated
            const upaWithNewPrimaryStatus = await transactionManager.findOne(UserProfileAccount, {
                id: userProfileAccountId
            });

            // Only allow admins to update other users' default UserProfileAccount
            if (
                upaWithNewPrimaryStatus.userProfileId !== profile.id &&
                !permissions.some(
                    permission =>
                        permission.accessType === PermissionAccessType.ADMIN_USER_MANAGEMENT &&
                        permission.accessLevel === PermissionAccessLevel.FULL
                )
            ) {
                throw new Error(
                    'Unable to modify UserProfileAccount -- requesting user does not own the account at the requested id'
                );
            }

            // Find the existing primary UserProfileAccount
            const upaWithRemovedPrimaryStatus = await transactionManager.findOne(
                UserProfileAccount,
                {
                    userProfileId: profile.id,
                    isPrimary: true
                }
            );

            // Shouldn't ever not be the case, but don't fail by bypassing this part of the transaction, if so
            if (!!upaWithRemovedPrimaryStatus) {
                upaWithRemovedPrimaryStatus.isPrimary = false;
                await transactionManager.save(upaWithRemovedPrimaryStatus);
            }

            upaWithNewPrimaryStatus.isPrimary = true;

            return await transactionManager.save(upaWithNewPrimaryStatus);
        });
    }
}
