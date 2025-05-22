import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Application } from 'express';

import { importTransactions } from '../cron/accounting/importTransactions';
import {
    updateInstitutionAccountHoldings,
    updateSharedHoldings
} from '../cron/accounting/updateHoldings';
import {
    createContributionsPayout,
    getTransactionDetails
} from '../cron/reconciliation/createContributionsPayout';
import { importManualPositionsAndTransactions } from '../scripts/accounting/importManualPositionsAndTransactions';
import { seedChartOfAccounts } from '../scripts/accounting/seedChartOfAccounts';
import { importGrants } from '../scripts/fundtransactions/importGrants';
import { getOrCreateConnection } from '../typeorm';
import { Request, Response } from '../types/Http';
import { healthcheck } from '../utilities/healthcheck';
import { FundTransactionDetail, InstitutionAccountTransaction, WebhookEvent } from '../models';
import { createContributionFromOrphanedSource } from '../utilities/createContribution';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';

import { processReconciledTransactions } from '../utilities/reconciliation';
import { createCashTransactionDetails } from '../utilities/transactionDetail';
import { handleChargeSucceeded } from '../cron/stripe-webhooks/charges';
import { initiateRecurringAndFutureContributions } from '../cron/recurring-transactions/initiateRecurringAndFutureContributions';
import { amendContributions } from '../scripts/fundtransactions/amendContributions';
import { contributionUpdates1962 } from '../scripts/fundtransactions/TS-1962-contribution-updates';
import { initiateRecurringAndFutureGrants } from '../cron/recurring-transactions/initiateRecurringAndFutureGrants';
import { generateTemporaryPassword } from '../utilities/temporaryPassword';

dayjs.extend(isSameOrBefore);

export function addTestMiddleware(app: Application) {
    app.get('/api/test', async function(req: Request, res: Response) {
        if (process.env.BASE_URL !== 'http://localhost:3000') {
            return res.status(404).send('nope');
        }

        try {
            // add function to test here
        } catch (error) {
            console.error('bummer', error);
            return res.status(500).send(error);
        }

        return res.status(200).send('testing completed 🍾');
    });

    // seed fund investment accounts
    app.get('/api/seedChartOfAccounts', async function(req: Request, res: Response) {
        if (process.env.BASE_URL !== 'http://localhost:3000') {
            return res.status(404);
        }
        await seedChartOfAccounts();

        return res.status(200);
    });

    // import grants
    app.get('/api/importGrants', async function(req: Request, res: Response) {
        if (process.env.BASE_URL !== 'http://localhost:3000') {
            return res.status(404).send('nope');
        }
        const result = await importGrants();

        return res.status(200).json(result);
    });

    app.get('/api/importManualPositionsAndTransactions', async function(
        req: Request,
        res: Response
    ) {
        if (process.env.BASE_URL !== 'http://localhost:3000') {
            return res.status(404);
        }
        const result = await importManualPositionsAndTransactions();

        return res.status(200).json(result);
    });

    // manually create contribution stripe payouts
    app.get('/api/createStripePayout', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send(':(');
        }

        const transactions = await getTransactionDetails();
        if (transactions.length === 0) {
            return res
                .status(200)
                .send('Unable to create Stripe payout, no transactions available for batching');
        }
        const batches = await createContributionsPayout();
        if (batches) {
            const response = batches.map(batch => {
                return {
                    message: 'Created payout in Stripe, new Batch should appear in 5-10 minutes.',
                    batchCode: batch.batchCode,
                    description: batch.description,
                    amount: batch.amount,
                    transactions: batch.transactions.map(
                        t => `Code ${t.transactionCode}: Amount ${t.amount}`
                    )
                };
            });
            return res.status(200).json({ response: response });
        }

        return res.status(200).send('Unable to create Stripe payout');
    });

    // update holdings
    app.get('/api/updateHoldings', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404);
        }
        updateInstitutionAccountHoldings();
        updateSharedHoldings();
        res.status(200).send('yay updates');
    });

    // health check
    app.get('/api/healthcheck', async function(req: Request, res: Response) {
        try {
            const result = await healthcheck();
            res.status(200).send(result);
        } catch (error) {
            res.status(500).json(error);
        }
    });

    // import transactions
    app.get('/api/importTransactions', async function(req: Request, res: Response) {
        const { accountid, start, end } = req.query;

        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nice try');
        }

        let startDate = null;
        let endDate = null;

        if (start && typeof start === 'string') {
            startDate = dayjs(start).utc();
        }

        if (end && typeof end === 'string') {
            endDate = dayjs(end).utc();
        }

        importTransactions(startDate, endDate, accountid as string);
        res.status(200).send('transactions imported 👯‍♂️');
    });

    // fix broken transfers
    app.get('/api/fixBrokenTransfers', async function(req: Request, res: Response) {
        const { transactionId, reconciliationId } = req.query as {
            transactionId: string;
            reconciliationId: string;
        };
        if (!req.hostname.match(/dev|staging|localhost/) || !transactionId || !reconciliationId) {
            return res.status(404).send();
        }
        const connection = await getOrCreateConnection({ logging: false });
        const iaTransRepo = connection.getRepository(InstitutionAccountTransaction);

        const badIATrans = await iaTransRepo.findOneOrFail(transactionId);

        // don't await
        processReconciledTransactions(req, reconciliationId, [badIATrans]);

        res.status(200).send('fixBrokenTransfers called');
    });

    // create contributions for "orphaned" sources
    app.get('/api/createContributionsForOrphanedSources', async function(
        req: Request,
        res: Response
    ) {
        const { fundId, sourceId, amount, feeAmount, paymentType, date } = req.query as {
            fundId: string;
            sourceId: string;
            amount: string;
            feeAmount: string;
            paymentType: string;
            date: string;
        };
        if (
            !req.hostname.match(/dev|staging|localhost/) ||
            !fundId ||
            !sourceId ||
            !amount ||
            !feeAmount ||
            !paymentType ||
            !date
        ) {
            return res.status(404).send();
        }

        const result = await createContributionFromOrphanedSource(
            fundId,
            sourceId,
            +amount,
            +feeAmount,
            date,
            paymentType
        ).catch(error => {
            res.status(500).send(`Bad Request ${error}`);
        });

        res.status(200).send('createContributionsForOrphanedSources called');
    });

    app.get('/api/generateMissingInvestments', async function(req: Request, res: Response) {
        const { contributionId } = req.query;

        const connection = await getOrCreateConnection();

        const contributionCash = await connection.manager
            .createQueryBuilder(FundTransactionDetail, 'ftd')
            .leftJoinAndSelect('ftd.transactionDetailType', 'tdt')
            .where('ftd.fundTransactionId = :contributionId', { contributionId })
            .andWhere('tdt.name = :cashIn', { cashIn: TransactionDetailTypeName.CASH_IN })
            .getOne();

        const investments = await connection.manager
            .createQueryBuilder(FundTransactionDetail, 'ftd')
            .leftJoinAndSelect('ftd.transactionDetailType', 'tdt')
            .where('ftd.fundTransactionId = :contributionId', { contributionId })
            .andWhere('tdt.name = :cashIn', { cashIn: TransactionDetailTypeName.INVESTMENT })
            .getMany();

        if (investments.length === 0) {
            // don't await this
            createCashTransactionDetails(connection.manager, [contributionCash.id]);
        } else {
            res.status(500).send('Investments already created for this contribution.');
        }

        res.status(200).send('investments generated');
    });

    app.get('/api/testStripeChargeSuccess', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nice try');
        }
        const { chargeId } = req.query;

        const event = new WebhookEvent();

        event.eventData = {
            object: {
                id: chargeId
            }
        };

        await handleChargeSucceeded(event, true);

        res.status(200).send('webhook complete');
    });

    app.get('/api/triggerRecurringContribs', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nice try');
        }

        await initiateRecurringAndFutureContributions();

        res.status(200).send('done');
    });

    app.get('/api/triggerRecurringGrants', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nice try');
        }

        await initiateRecurringAndFutureGrants();

        res.status(200).send('done');
    });

    app.get('/api/temporary_amendContributions', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nice try');
        }
        await amendContributions();
        res.status(200).send('done');
    });

    app.get('/api/temporary_1962', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nice try');
        }
        await contributionUpdates1962();
        res.status(200).send('done');
    });

    app.get('/api/temporaryPasswordTest', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nice try');
        }
        const password = generateTemporaryPassword();
        res.status(200).send(password);
    });
}
