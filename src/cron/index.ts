import { schedule } from 'node-cron';

import { importTransactions } from './accounting/importTransactions';
import { updateFundBalances } from './accounting/updateFundBalances';
import { updateInstitutionAccountHoldings, updateSharedHoldings } from './accounting/updateHoldings';
import { updateInstitutionAccounts } from './accounting/updateInstitutionAccounts';
import { sendEmailsFromQueue } from './email/sendEmail';
import { processIDonateWebhookEvents } from './idonate-webhooks';
import { updateExpiredRecipientApprovalStatuses } from './recipients/updateExpiredRecipientApprovalStatuses';
import { createContributionsPayout } from './reconciliation/createContributionsPayout';
import { initiateRecurringAndFutureContributions } from './recurring-transactions/initiateRecurringAndFutureContributions';
import { initiateRecurringAndFutureGrants } from './recurring-transactions/initiateRecurringAndFutureGrants';
import { updateTransactionRecurrenceJobDate } from './recurring-transactions/util';
import { processStripeWebhookEvents } from './stripe-webhooks';

const isNotDev = process.env.NODE_ENV !== 'development';

export function setupCronJobs() {
    console.log('Setup Cron Jobs');

    // Run daily at midnight (06:00 UTC)
    schedule('0 6 * * *', async function() {
        try {
            if (isNotDev) console.log('Start Cron(0 6 * * *)');
            await createContributionsPayout();
            await updateExpiredRecipientApprovalStatuses();
            if (isNotDev) console.log('End Cron(0 6 * * *)');
        } catch (err) {
            console.error('CRON JOB ERROR IN: 0 6 * * *)');
            console.error(err);
        }
    });

    // Run daily at 5:38AM (11:38 UTC)
    schedule('38 11 * * *', async function() {
        /** @note break into separate try catch blocks so if one fails the other can still run */
        if (isNotDev) console.log('Start Cron(38 11 * * *) - START');

        await updateTransactionRecurrenceJobDate();

        // grants
        try {
            if (isNotDev) console.log('Start Cron(38 11 * * *) - grants');
            await initiateRecurringAndFutureGrants();
        } catch (err) {
            console.error('CRON JOB ERROR IN: 38 11 * * * - grants');
            console.error(err);
        }
        // contribution
        try {
            if (isNotDev) console.log('Start Cron(38 11 * * *) - contributions');
            await initiateRecurringAndFutureContributions();
        } catch (err) {
            console.error('CRON JOB ERROR IN: 38 11 * * * - contributions');
            console.error(err);
        }

        if (isNotDev) console.log('End Cron(38 11 * * *)');
    });

    // Run every 10 minutes
    schedule('*/10 * * * *', async function() {
        try {
            if (isNotDev) console.log('Start Cron(*/10 * * * *)');
            await processStripeWebhookEvents();
            await processIDonateWebhookEvents();
            if (isNotDev) console.log('End Cron(*/10 * * * *)');
        } catch (err) {
            console.error('CRON JOB ERROR IN: */10 * * * *');
            console.error(err);
        }
    });

    // Run daily at 9:30AM (15:30 UTC)
    schedule('30 15 * * *', async function() {
        try {
            if (isNotDev) console.log('Start Cron(30 15 * * *)');
            await updateInstitutionAccounts();
            if (isNotDev) console.log('End Cron(30 15 * * *)');
        } catch (err) {
            console.error('CRON JOB ERROR IN: 30 15 * * *');
            console.error(err);
        }
    });

    // Run daily at 10AM (16:00 UTC)
    schedule('0 16 * * *', async function() {
        try {
            if (isNotDev) console.log('Start Cron(0 16 * * *)');
            await updateInstitutionAccountHoldings();
            await updateSharedHoldings();
            if (isNotDev) console.log('End Cron(0 16 * * *)');
        } catch (err) {
            console.error('CRON JOB ERROR IN: 0 16 * * *');
            console.error(err);
        }
    });

    // Run daily at 11AM
    schedule('0 17 * * *', async function() {
        try {
            if (isNotDev) console.log('Start Cron(0 17 * * *)');
            await importTransactions();
            if (isNotDev) console.log('End Cron(0 17 * * *)');
        } catch (err) {
            console.error('CRON JOB ERROR IN: 0 17 * * *');
            console.error(err);
        }
    });
}
