import { Application } from 'express';
import { createContribution } from '../utilities/createContribution';
import { sendEmailsFromQueue } from '../cron/email/sendEmail';
import { importTransactions } from '../cron/accounting/importTransactions';
import {
    updateInstitutionAccountHoldings,
    updateSharedHoldings
} from '../cron/accounting/updateHoldings';
import { updateInstitutionAccounts } from '../cron/accounting/updateInstitutionAccounts';
import { processIDonateWebhookEvents } from '../cron/idonate-webhooks';
import { initiateRecurringAndFutureContributions } from '../cron/recurring-transactions/initiateRecurringAndFutureContributions';
import {
    initiateGrant,
    initiateRecurringAndFutureGrants,
    createGrantSeriesOccurrence
} from '../cron/recurring-transactions/initiateRecurringAndFutureGrants';
import { updateTransactionRecurrenceJobDate } from '../cron/recurring-transactions/util';
import { processStripeWebhookEvents } from '../cron/stripe-webhooks';
import { generateGrantPdf } from '../jobs/generateGrantPdf';
import { sendEmail } from '../jobs/sendEmail';
import { Request, Response } from '../types/Http';
import { getOrCreateConnection } from '../typeorm';
import { updateContribution } from '../utilities/updateContribution';
import { OccurrenceOptionsRecord } from '../jobs/processGrant';

export function addCronMiddleware(app: Application) {
    app.get('/updateInstitutionAccountHoldings', async function(req: Request, res: Response) {
        try {
            await updateInstitutionAccountHoldings();
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - updateInstitutionAccountHoldings: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.get('/updateSharedHoldings', async function(req: Request, res: Response) {
        try {
            await updateSharedHoldings();
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - updateSharedHoldings: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.get('/importTransactions', async function(req: Request, res: Response) {
        try {
            await importTransactions();
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - importTransactions: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.get('/updateInstitutionAccounts', async function(req: Request, res: Response) {
        try {
            await updateInstitutionAccounts();
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - updateInstitutionAccounts: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.get('/initiateRecurringAndFutureGrants', async function(req: Request, res: Response) {
        try {
            await updateTransactionRecurrenceJobDate();
            await initiateRecurringAndFutureGrants();
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - updateTransactionRecurrenceJobDate: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.get('/initiateRecurringAndFutureContributions', async function(
        req: Request,
        res: Response
    ) {
        try {
            await updateTransactionRecurrenceJobDate();
            await initiateRecurringAndFutureContributions();
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - updateTransactionRecurrenceJobDate: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.get('/processStripeWebhookEvents', async function(req: Request, res: Response) {
        try {
            await processStripeWebhookEvents();
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - processStripeWebhookEvents: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.get('/processIDonateWebhookEvents', async function(req: Request, res: Response) {
        try {
            await processIDonateWebhookEvents();
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - processIDonateWebhookEvents: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.post('/sendEmail', async function(req: Request, res: Response) {
        try {
            const { emailType, emailData } = req.body;
            await sendEmail(emailType, emailData);
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - sendEmail: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.post('/generateGrantPDF', async function(req: Request, res: Response) {
        try {
            const { grantId } = req.body;
            await generateGrantPdf(grantId);
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - generatePDF: ', error.message);
            return res.status(500).send(error.message);
        }
    });

    app.post('/createContribution', async function(req: Request, res: Response) {
        try {
            const connection = await getOrCreateConnection();
            const {
                userProfileId,
                userProfileAccountId,
                transactionTypeId,
                input,
                overrideOptions
            } = req.body;
            await createContribution(
                connection.manager,
                userProfileId,
                userProfileAccountId,
                transactionTypeId,
                input,
                overrideOptions
            );
            return res.status(200).send('Success');
        } catch (e) {
            console.error('ERROR - createContribution: ', e.message);
            return res.status(500).send(e.message);
        }
    });

    app.post('/updateContribution', async function(req: Request, res: Response) {
        try {
            const connection = await getOrCreateConnection();
            const { userProfileId, input, fundTxId } = req.body;
            await updateContribution(connection.manager, userProfileId, input, fundTxId);
            return res.status(200).send('Success');
        } catch (e) {
            console.error('ERROR - updateContribution: ', e.message);
            return res.status(500).send(e.message);
        }
    });

    app.post('/initiateGrant', async function(req: Request, res: Response) {
        try {
            const {
                transactionId,
                readyForPayoutId,
                readyForDivestmentId,
                transactionAmount
            } = req.body;
            await initiateGrant(
                transactionId,
                transactionAmount,
                readyForPayoutId,
                readyForDivestmentId
            );
            return res.status(200).send('Success');
        } catch (e) {
            console.error('ERROR - initiateGrant: ', e.message);
            return res.status(500).send(e.message);
        }
    });

    /** 
        This endpoint is only called py the PROCESS_GRANT graphile worker job.
    */
    app.post('/processGrant', async function(req: Request, res: Response) {
        try {
            const { occurrenceOptions, skipEmail } = req.body;

            /* 
                Use the same run-time type check as the Graphile Worker job to ensure a valid payload.
                This check will throw an error if it encounters an invalid payload for the occurrence options.
            */
            const validatedOccurrenceOptions = OccurrenceOptionsRecord.check(occurrenceOptions)
            await createGrantSeriesOccurrence(validatedOccurrenceOptions, skipEmail);
            return res.status(200).send('Success');
        } catch (e) {
            console.error('ERROR - updateContribution: ', e.message);
            return res.status(500).send(e.message);
        }
    });
    app.get('/sendEmailFromQueue', async function(req: Request, res: Response) {
        try {
            await sendEmailsFromQueue();
            return res.status(200).send('Success');
        } catch (error) {
            console.error('ERROR - sendEmailFromQueue: ', error.message);
            return res.status(500).send(error.message);
        }
    });
}
