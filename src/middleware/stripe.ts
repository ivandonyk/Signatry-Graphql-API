import { Application } from 'express';
import { stripeWebhookController } from '../controllers/stripeWebhooks';

export async function addStripeWebhookMiddleware(app: Application) {
    app.post('/api/stripe', stripeWebhookController.handleEvent);
}
