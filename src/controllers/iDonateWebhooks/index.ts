import { Request, Response } from '../../types/Http';
import { WebhookEvent } from '../../models';
import { WebhookEventSource } from '../../models/WebhookEvent';
import { parseFromFormat } from '../../utilities/datetime';

class IDonateWebhookController {
    /**
     * Handle stripe webhook POST request
     * @param req
     * @param res
     */
    async handleEvent(req: Request, res: Response): Promise<Response> {
        const manager = req.typeorm.manager;
        const { type, payload, created } = req.body;
        const parsedCreatedDate = parseFromFormat(created, 'YYYY-MM-DDTHH:mm:ss');

        await manager.getRepository(WebhookEvent).save({
            source: WebhookEventSource.IDONATE,
            eventType: type,
            eventData: payload,
            eventCreatedAt: parsedCreatedDate
        });

        return res.status(200).send();
    }
}

export const iDonateWebhookController = new IDonateWebhookController();
