import { EntityManager } from 'typeorm';
import { getStripeClient } from '../../stripe';
import { FundTransaction, FundTransactionDetail, WebhookEvent } from '../../models';
import {
    FundTransactionSource,
    FundTransactionSourceStatusValue
} from '../../models/FundTransactionSource';
import { TransactionTypeValue } from '../../models/TransactionType';
import { TransactionDetailTypeName } from '../../models/TransactionDetailType';
import {
    getTransactionDetailStatuses,
    TransactionStatusMap,
    TransactionDetailStatusMap
} from '../../utilities/getTransactionStatuses';
import { getOrCreateConnection } from '../../typeorm';
import { EmailService } from '../../sendgrid';
import { EVENTS, eventEmitter } from '../../events';
import { FundTransactionRepository } from '../../repositories/FundTransaction';
import { createCashTransactionDetails } from '../../utilities/transactionDetail';

/**
 * Retrieve transaction status maps
 */
async function getStatuses(
    manager: EntityManager
): Promise<{
    transactionDetailStatuses: TransactionDetailStatusMap;
}> {
    // get transaction detail status IDs, indexed by name
    const transactionDetailStatuses = await getTransactionDetailStatuses(manager);
    return { transactionDetailStatuses };
}

/**
 * Retrieve transaction source by Stripe charge ID
 */
async function getSource(id: string, manager: EntityManager): Promise<FundTransactionSource> {
    const source = await manager.getRepository(FundTransactionSource).findOne(
        { chargeId: id },
        {
            relations: [
                'fundTransaction',
                'fundTransaction.transactionDetails',
                'fundTransaction.transactionDetails.transactionDetailType',
                'fundTransaction.transactionType'
            ]
        }
    );
    return source;
}

/**
 * Get the fundTransactionSource.status value that
 * matches the provided stripe failure code
 *
 * @param failureCode
 */
function getFailureStatus(failureCode: string) {
    switch (failureCode) {
        case 'insufficient_funds': {
            return FundTransactionSourceStatusValue.INSUFFICIENT_FUNDS;
        }
        case 'account_closed':
        case 'no_account':
        case 'debit_not_authorized':
        case 'invalid_currency': {
            return FundTransactionSourceStatusValue.RETURNED_BY_BANK;
        }
        default: {
            return FundTransactionSourceStatusValue.FAILED;
        }
    }
}

export async function handleChargeSucceeded(event: WebhookEvent, skipEmails?: boolean) {
    console.log('Processing Stripe charge');
    const connection = await getOrCreateConnection();
    const manager = connection.manager;
    const { transactionDetailStatuses } = await getStatuses(manager);
    const data = event.eventData;
    const source = await getSource(data.object.id, manager);
    const ftRepo = manager.getCustomRepository(FundTransactionRepository);
    if (!source) {
        console.log('Source for Stripe charge not found');
        return;
    }

    // set transaction source status = POSTED
    source.status = FundTransactionSourceStatusValue.POSTED;
    // send emails
    const emailService = new EmailService();
    const contributionCashTransactionDetail = source.fundTransaction.transactionDetails.find(
        (fundTransactionDetail: FundTransactionDetail) => {
            return (
                fundTransactionDetail.transactionDetailType.name ===
                TransactionDetailTypeName.CASH_IN
            );
        }
    );
    const feeTransactionDetail = source.fundTransaction.transactionDetails.find(
        (fundTransactionDetail: FundTransactionDetail) => {
            return (
                fundTransactionDetail.transactionDetailType.name === TransactionDetailTypeName.FEE
            );
        }
    );
    if (
        process.env.NODE_ENV !== 'development' &&
        typeof contributionCashTransactionDetail !== 'undefined' &&
        !skipEmails
    ) {
        await emailService.sendFundContributionTaxReceipts(
            manager,
            contributionCashTransactionDetail.id,
            feeTransactionDetail.id
        );
    }
    if (process.env.RECONCILIATION_ENABLED === 'true') {
        // update cash_in record to `ready for payout`
        contributionCashTransactionDetail.transactionDetailStatusId =
            transactionDetailStatuses.READY_FOR_PAYOUT;
    } else {
        // update cash_in record to `ready for investment` and emit event
        contributionCashTransactionDetail.transactionDetailStatusId =
            transactionDetailStatuses.READY_FOR_INVESTMENT;

        createCashTransactionDetails(manager, [contributionCashTransactionDetail.id]);
    }

    feeTransactionDetail.transactionDetailStatusId = transactionDetailStatuses.COMPLETE;

    ftRepo.update(source.fundTransaction.id, {
        chargedOn: new Date()
    });

    // save fund transaction source
    await manager.save(source);
    await manager.save([contributionCashTransactionDetail, feeTransactionDetail]);
}

export async function handleChargeFailed(event: WebhookEvent) {
    const connection = await getOrCreateConnection();
    const manager = connection.manager;
    const data = event.eventData;
    const source = await getSource(data.object.id, manager);
    // if not found, return 200 so stripe doesn't retry this event
    if (!source) return;

    source.status = getFailureStatus(data.object.failure_code);

    // save fund transaction source
    await manager.save(source);
}
