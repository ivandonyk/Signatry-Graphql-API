import { Application } from 'express';
import { iDonateWebhookController } from '../controllers/iDonateWebhooks';

export async function addIDonateWebhookMiddleware(app: Application) {
    app.post('/api/idonate', iDonateWebhookController.handleEvent);
}
