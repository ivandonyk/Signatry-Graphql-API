import { Resolver, Mutation, Ctx, Arg } from 'type-graphql';
import { GraphQLContext } from '../context';
import { BaseResolver } from './core/BaseResolver';
import { PermissionLock } from '../decorators/permissionDecorator';
import { getStripeClient } from '../stripe';
import Stripe from 'stripe';
import { getOrCreateStripeCustomer } from '../utilities/getOrCreateStripeCustomer';
import { UserProfile } from '../models';
import { UserProfileAccount, UserProfileAccountTypes } from '../models/UserProfileAccount';
import { UIStripeCard } from '../models/UIFundingSource';
import { AccountTypes, largeIdentify, newAccountAdded } from '../utilities/segmentConfig';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver()
export class CreditCardResolver extends BaseResolver {
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfileAccount, {
        description:
            'Attaches a Stripe Source to the Stripe Customer associated with the passed userProfileId; creates the Stripe Customer for the userProfileId if not yet created'
    })
    async createStripeSourceForUserProfile(
        @Ctx() context: GraphQLContext,
        @Arg('stripeToken') stripeToken: string, // begins with 'pm_'
        @Arg('userProfileId') userProfileId: string
    ): Promise<UserProfileAccount> {
        const { manager } = context.typeorm;
        const userProfile = await manager.findOne(UserProfile, userProfileId);

        if (!userProfile) throw new Error('A UserProfile with the provided id could not be found.');

        const stripeClient = getStripeClient();

        // Get the current Stripe customer, if exists; else, create one and associate the UserProfile.customerId with the Stripe customer.id
        const stripeCustomer = await getOrCreateStripeCustomer(userProfile, stripeClient, manager);

        const stripeSource = (await stripeClient.customers.createSource(stripeCustomer.id, {
            source: stripeToken
        })) as Stripe.Card; // cast type to ensure choose correct 'createSource' overload. Thanks Jeff!

        let alreadyExists = false;

        if (stripeCustomer.sources?.data) {
            alreadyExists = stripeCustomer.sources.data.some(
                (source: Stripe.Card) => source.fingerprint === stripeSource.fingerprint
            );
        }

        if (alreadyExists) {
            await stripeClient.customers.deleteSource(stripeCustomer.id, stripeSource.id);
            throw new Error('Card already exists on this account');
        }

        const upaRepo = manager.getRepository(UserProfileAccount);

        // Get the user's UserProfileAccounts to see if it's the first one, if so, save it as their primary/"preferred" account
        const userProfileAccounts = await upaRepo.find({ userProfileId });

        // Create a UserProfileAccount record for the new Stripe PaymentMethod
        const newUserProfileAccount = await upaRepo.save(
            upaRepo.create({
                isPrimary: !userProfileAccounts.length,
                itemId: null, // Not a Plaid BANK_ACCOUNT
                accessToken: null, // Not a Plaid BANK_ACCOUNT
                institutionId: null, // Not a Plaid BANK_ACCOUNT
                accountId: null, // Not a Plaid BANK_ACCOUNT
                paymentMethodId: stripeSource.id,
                userProfile: userProfile,
                userProfileId: userProfile.id,
                accountType: UserProfileAccountTypes.CREDIT_CARD,
                createdBy: userProfile.id
            })
        );

        // for email notification
        const institutionName = stripeSource.brand;
        const accountType = `${stripeSource.funding[0].toUpperCase()}${stripeSource.funding.slice(
            1
        )} ${stripeSource.object[0].toUpperCase()}${stripeSource.object.slice(1)}`;

        // send email notification
        await context.email.sendAddedNewFundingSourceNotification(
            manager,
            context.user.email,
            institutionName,
            accountType
        );

        largeIdentify(manager, userProfile.id);

        await newAccountAdded(manager, userProfile.id, AccountTypes.CREDIT_CARD);

        return newUserProfileAccount;
    }

    @PermissionLock(PermissionAccessType.ADMIN_CONTRIBUTIONS, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfileAccount, {
        description:
            'Attaches a Stripe Source to the Stripe Customer associated with the passed userProfileId; creates the Stripe Customer for the userProfileId if not yet created. Also allows use of already created stripe cards and recovers the correct UPA'
    })
    async createStripeSourceOnBehalfOfUserProfile(
        @Ctx() context: GraphQLContext,
        @Arg('stripeToken') stripeToken: string, // begins with 'pm_'
        @Arg('userProfileId') userProfileId: string
    ): Promise<UserProfileAccount> {
        const { manager } = context.typeorm;
        const userProfile = await manager.findOne(UserProfile, userProfileId);
        const upaRepo = manager.getRepository(UserProfileAccount);

        if (!userProfile) throw new Error('A UserProfile with the provided id could not be found.');

        const stripeClient = getStripeClient();

        // Get the current Stripe customer, if exists; else, create one and associate the UserProfile.customerId with the Stripe customer.id
        const stripeCustomer = await getOrCreateStripeCustomer(userProfile, stripeClient, manager);

        const stripeSource = (await stripeClient.customers.createSource(stripeCustomer.id, {
            source: stripeToken
        })) as Stripe.Card; // cast type to ensure choose correct 'createSource' overload. Thanks Jeff!

        let alreadyExists = false;

        if (stripeCustomer.sources?.data) {
            alreadyExists = stripeCustomer.sources.data.some(
                (source: Stripe.Card) => source.fingerprint === stripeSource.fingerprint
            );
        }
        if (alreadyExists) {
            const source = stripeCustomer.sources.data.find(
                (source: Stripe.Card) => source.fingerprint === stripeSource.fingerprint
            );

            const userProfileAccounts = await manager.find(UserProfileAccount, { userProfileId });

            const userProfileAccount = userProfileAccounts.find(
                upa => upa.paymentMethodId === source.id
            );

            if (!!userProfileAccount) {
                await stripeClient.customers.deleteSource(stripeCustomer.id, stripeSource.id);
                return userProfileAccount;
            } else {
                // Create a UserProfileAccount record for the new Stripe PaymentMethod
                const newUserProfileAccount = await upaRepo.save(
                    upaRepo.create({
                        isPrimary: !userProfileAccounts.length,
                        itemId: null, // Not a Plaid BANK_ACCOUNT
                        accessToken: null, // Not a Plaid BANK_ACCOUNT
                        institutionId: null, // Not a Plaid BANK_ACCOUNT
                        accountId: null, // Not a Plaid BANK_ACCOUNT
                        paymentMethodId: stripeSource.id,
                        userProfile: userProfile,
                        userProfileId: userProfile.id,
                        accountType: UserProfileAccountTypes.CREDIT_CARD,
                        createdBy: userProfile.id
                    })
                );

                // for email notification
                const institutionName = stripeSource.brand;
                const accountType = `${stripeSource.funding[0].toUpperCase()}${stripeSource.funding.slice(
                    1
                )} ${stripeSource.object[0].toUpperCase()}${stripeSource.object.slice(1)}`;

                await Promise.all([
                    newAccountAdded(manager, userProfile.id, AccountTypes.CREDIT_CARD),
                    // send email notification
                    context.email.sendAddedNewFundingSourceNotification(
                        manager,
                        context.user.email,
                        institutionName,
                        accountType
                    )
                ]);

                return newUserProfileAccount;
            }
        }

        // Get the user's UserProfileAccounts to see if it's the first one, if so, save it as their primary/"preferred" account
        const userProfileAccounts = await upaRepo.find({ userProfileId });

        // Create a UserProfileAccount record for the new Stripe PaymentMethod
        const newUserProfileAccount = await upaRepo.save(
            upaRepo.create({
                isPrimary: !userProfileAccounts.length,
                itemId: null, // Not a Plaid BANK_ACCOUNT
                accessToken: null, // Not a Plaid BANK_ACCOUNT
                institutionId: null, // Not a Plaid BANK_ACCOUNT
                accountId: null, // Not a Plaid BANK_ACCOUNT
                paymentMethodId: stripeSource.id,
                userProfile: userProfile,
                userProfileId: userProfile.id,
                accountType: UserProfileAccountTypes.CREDIT_CARD,
                createdBy: userProfile.id
            })
        );

        return newUserProfileAccount;
    }
}
