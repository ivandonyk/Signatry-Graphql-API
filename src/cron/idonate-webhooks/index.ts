import { WebhookEvent } from '../../models';
import { WebhookEventSource } from '../../models/WebhookEvent';
import { getOrCreateConnection } from '../../typeorm';
import { dayjs } from '../../utilities/datetime';
import { handleTransactionCreated } from './transaction';

export async function processIDonateWebhookEvents() {
    console.log('processIDonateWebhookEvents: Started');
    const connection = await getOrCreateConnection();

    const fiveMinutesAgo = dayjs().subtract(5, 'minute');
    const eventRepo = connection.getRepository(WebhookEvent);
    const events = await eventRepo
        .createQueryBuilder('webhookEvent')
        .where('webhookEvent.source = :source', { source: WebhookEventSource.IDONATE })
        .andWhere('webhookEvent.eventCreatedAt < :time', {
            time: fiveMinutesAgo.format('YYYY-MM-DD HH:mm:ss') // Provides a buffer for database transactions to complete before handling webhook events
        })
        .take(50)
        .getMany();

    // build array of promises and run in bulk
    const creationPromises: Promise<WebhookEvent>[] = [];

    events.forEach(function(event) {
        // Handle event by type
        switch (event.eventType) {
            case 'transaction.created': {
                creationPromises.push(handleTransactionCreated(event));
                break;
            }
            default:
        }
    });

    // Allows all results to fail/succeed
    const results = await Promise.allSettled(creationPromises);

    const fulfilled: WebhookEvent[] = [];
    const rejected: PromiseRejectedResult[] = [];

    // separate by status
    results.forEach(result => {
        if (result.status === 'fulfilled') fulfilled.push(result.value);
        else if (result.status === 'rejected') rejected.push(result.reason);
    });

    // Only remove the ones that are actually completed
    await eventRepo.remove(fulfilled);

    console.log(`processIDonateWebhookEvents: Finished processing iDonate webhooks
    fulfilled: ${fulfilled.length}
    rejected: ${rejected.length} 
    `);

    // log out the reasons for failures
    if (rejected.length) {
        rejected.forEach(reason => console.error(`processIDonateWebhookEvents: Error - ${reason}`));
        throw new Error('processIDonateWebhookEvents: Unable to process all events');
    }

    console.log('processIDonateWebhookEvents: Finished');
    return;
}
