import Stripe from 'stripe';

const { STRIPE_API_KEY } = process.env;

let client: Stripe;

export function getStripeClient(): Stripe {
    if (!client)
        client = new Stripe(STRIPE_API_KEY, {
            maxNetworkRetries: 2,
            apiVersion: '2020-08-27',
            typescript: true
        });
    return client;
}
