import { getStripeClient } from '../../stripe';
import { Request, Response } from '../../types/Http';
import { WebhookEvent } from '../../models';
import { WebhookEventSource } from '../../models/WebhookEvent';

class StripeWebhookController {
    /**
     * Handle stripe webhook POST request
     * @param req
     * @param res
     */
    async handleEvent(req: Request, res: Response): Promise<Response> {
        const stripeClient = getStripeClient();
        const manager = req.typeorm.manager;
        const { type, data, created } = req.body;

        // verify webhook signature
        try {
            stripeClient.webhooks.constructEvent(
                req.rawBody,
                req.headers['stripe-signature'],
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        await manager.getRepository(WebhookEvent).save({
            source: WebhookEventSource.STRIPE,
            eventType: type,
            eventData: data,
            eventCreatedAt: new Date(created * 1000) //seconds to milliseconds
        });

        return res.status(200).send();
    }
}

export const stripeWebhookController = new StripeWebhookController();
