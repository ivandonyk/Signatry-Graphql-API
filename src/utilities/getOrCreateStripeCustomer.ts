import { EntityManager } from 'typeorm';
import { UserProfile } from '../models';
import Stripe from 'stripe';

async function saveStripeCustomerToUserProfile(
    userProfile: UserProfile,
    stripeClient: Stripe,
    manager: EntityManager,
    description: string
): Promise<Stripe.Customer> {
    // Create a customer in STRIPE
    const stripeCustomer = await stripeClient.customers.create({
        name: userProfile.id, // Put Platform Profile Id here to match back
        description
    });

    // Save the new Stripe customer id to the UserProfile record
    userProfile.customerId = stripeCustomer.id;
    await manager.save(userProfile);

    return stripeCustomer as Stripe.Customer; // Explicit cast because function returns Customer | DeletedCustomer
}

/**
 * Get Stripe customer for UserProfile if it exists, otherwise create one and associate it with the current UserProfile
 * @param userProfile
 * @param stripeClient
 * @param manager
 * @param description
 */
export const getOrCreateStripeCustomer = async (
    userProfile: UserProfile,
    stripeClient: Stripe,
    manager: EntityManager,
    description?: string
): Promise<Stripe.Customer> => {
    if (!userProfile.customerId) {
        return await saveStripeCustomerToUserProfile(
            userProfile,
            stripeClient,
            manager,
            description
        );
    } else {
        try {
            return (await stripeClient.customers.retrieve(userProfile.customerId, {
                expand: ['sources']
            })) as Stripe.Customer;
        } catch (error) {
            if (error.statusCode === 404) {
                try {
                    return await saveStripeCustomerToUserProfile(
                        userProfile,
                        stripeClient,
                        manager,
                        description
                    );
                } catch (e) {
                    throw e;
                }
            } else {
                throw error;
            }
        }
    }
};
