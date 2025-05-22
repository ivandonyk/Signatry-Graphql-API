import { getOrCreateConnection } from '../../typeorm';
import { handlePayoutFailed, handlePayoutPaid } from './payouts';
import { handleChargeFailed, handleChargeSucceeded } from './charges';
import { WebhookEvent } from '../../models';
import { WebhookEventSource } from '../../models/WebhookEvent';
import { dayjs } from '../../utilities/datetime';

export async function processStripeWebhookEvents() {
    console.log('processStripeWebhookEvents: Started');
    const connection = await getOrCreateConnection();

    const oneMinuteAgo = dayjs().subtract(1, 'minute');
    const eventRepo = connection.getRepository(WebhookEvent);
    const events = await eventRepo
        .createQueryBuilder('webhookEvent')
        .where('webhookEvent.source = :source', { source: WebhookEventSource.STRIPE })
        .andWhere('webhookEvent.eventCreatedAt < :time', {
            time: oneMinuteAgo.format('YYYY-MM-DD HH:mm:ss') // Provides a buffer for database transactions to complete before handling webhook events
        })
        .orderBy('webhookEvent.eventCreatedAt', 'ASC')
        .take(50)
        .getMany();

    events.forEach(async function(event) {
        // Handle event by type
        switch (event.eventType) {
            case 'charge.succeeded': {
                await handleChargeSucceeded(event);
                break;
            }
            case 'charge.failed': {
                await handleChargeFailed(event);
                break;
            }
            case 'payout.paid': {
                await handlePayoutPaid(event);
                break;
            }
            case 'payout.failed': {
                await handlePayoutFailed(event);
                break;
            }
            default:
        }
    });

    await eventRepo.remove(events);
    console.log('processStripeWebhookEvents: Finished');
    return;
}
