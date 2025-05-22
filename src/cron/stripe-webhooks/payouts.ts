import { FundTransactionDetail, Payout, WebhookEvent } from '../../models';
import { PayoutStatusValue } from '../../models/Payout';
import { getOrCreateConnection } from '../../typeorm';
import { getTransactionDetailStatuses } from '../../utilities/getTransactionStatuses';

export async function handlePayoutPaid(event: WebhookEvent) {
    const connection = await getOrCreateConnection();
    const manager = connection.manager;
    const transactionDetailStatuses = await getTransactionDetailStatuses(manager);
    const data = event.eventData;

    const payout: Payout = await manager
        .getRepository(Payout)
        .findOne({ payoutId: data.object.id }, { relations: ['transactionDetails'] });

    if (!payout) {
        console.error(`Stripe payout not found for ${data.object.id}`);
        return;
    }
    // update payout status
    payout.status = PayoutStatusValue.PAID;
    await manager.save(payout);

    // update payout.transactionDetails' statuses
    payout.transactionDetails = payout.transactionDetails.map((t: FundTransactionDetail) => {
        t.transactionDetailStatusId = transactionDetailStatuses.PENDING_RECONCILIATION;
        return t;
    });
    await manager.save(payout.transactionDetails);
}

export async function handlePayoutFailed(event: WebhookEvent) {
    const connection = await getOrCreateConnection();
    const manager = connection.manager;
    const transactionDetailStatuses = await getTransactionDetailStatuses(manager);
    const data = event.eventData;

    const payout: Payout = await manager
        .getRepository(Payout)
        .findOne({ payoutId: data.object.id }, { relations: ['transactions'] });

    // update payout.transactionDetails' statuses
    // If a payout fails, we'll try to make another one tomorrow.
    // Mark transactions as ready for payout
    payout.transactionDetails = payout.transactionDetails.map((t: FundTransactionDetail) => {
        t.transactionDetailStatusId = transactionDetailStatuses.READY_FOR_PAYOUT;
        return t;
    });
    await manager.save(payout.transactionDetails);

    // update payout status
    payout.status = PayoutStatusValue.FAILED;
    await manager.save(payout);
}
