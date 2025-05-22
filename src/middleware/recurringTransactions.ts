import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { Application } from 'express';
import {
    createRecurringContributions,
    processRecurringContributions
} from '../cron/recurring-transactions/initiateRecurringAndFutureContributions';
import {
    processRecurringGrants,
    processRecurringGrantsFromDate
} from '../cron/recurring-transactions/initiateRecurringAndFutureGrants';
import { FundTransaction, TransactionRecurrenceJobDate } from '../models';
import { getOrCreateConnection } from '../typeorm';
import { Request, Response } from '../types/Http';
import { createContributionFromSeries } from '../utilities/createContribution';

dayjs.extend(isSameOrBefore);

export function addRecurringTransactionMiddleWare(app: Application) {
    /**
     * process recurring contributions
     * @param {string} date
     */
    app.get('/api/processRecurringContributions', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nope');
        }
        const connection = await getOrCreateConnection();

        // validate date from query params
        const date = req.query.date as string;
        let dateParam: string;
        if (Boolean(date) && dayjs(date).isValid()) dateParam = dayjs(date).format('YYYY-MM-DD');

        try {
            // update recurrence date
            await processRecurringContributions(connection, dateParam);
        } catch (error) {
            console.error('error processing contributions', error);
            return res.status(500).send(error);
        }

        return res.status(200).send('successfully processed contributions 🍾');
    });

    /**
     * create recurring contribution instances
     * @param {string} date
     */
    app.get('/api/initiateRecurringContributions', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nope');
        }

        const connection = await getOrCreateConnection();

        // validate date from query params
        const queryDate = req.query.date as string;
        let date: string;
        if (Boolean(queryDate) && dayjs(queryDate).isValid())
            date = dayjs(queryDate).format('YYYY-MM-DD');
        else return res.status(400).send(`bad date param: ${queryDate}`);

        try {
            // update recurrence date
            await connection.manager.update(TransactionRecurrenceJobDate, 1, {
                date: dayjs(date)
                    .startOf('day')
                    .add(12, 'hour')
                    .toDate()
            });
            await createRecurringContributions(connection, true);
        } catch (error) {
            console.error('error processing contributions', error);
            return res.status(500).send(error);
        }

        return res.status(200).send('successfully created contributions 🍾');
    });

    /**
     * create and process instance from contribution series
     * @param {string} code fund_transaction (series) transaction_code
     * @see {createRecurringContributions} graphql-api/src/cron/recurring-transactions/initiateRecurringAndFutureContributions.ts
     */
    app.get('/api/createContributionFromSeries', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(404).send('nope');
        }
        const { manager } = await getOrCreateConnection();

        const code = req.query.code as string;

        let contribution: FundTransaction;
        try {
            contribution = await createContributionFromSeries(code, manager);
        } catch (error) {
            console.error('error creating contribution from series:', error);
            return res.status(400).send(error);
        }

        return res
            .status(200)
            .send(
                `successfully created and processed contributions ${contribution.transactionCode} 🍾`
            );
    });

    /**
     * process recurring grants
     * @param {string} date
     * @param {string} runOnce
     */
    app.get('/api/initiateRecurringGrants', async function(req: Request, res: Response) {
        if (!req.hostname.match(/dev|staging|localhost/)) {
            return res.status(405).send('nope');
        }

        const connection = await getOrCreateConnection();
        const manager = connection.manager;

        const { runOnce } = req.query;
        // validate date param
        let dateParam: string;
        if (Boolean(req.query.date) && dayjs(req.query.date as string).isValid()) {
            dateParam = dayjs(req.query.date as string).format('YYYY-MM-DD');
        } else {
            return res.status(400).send(`invalid date: ${dateParam}`);
        }

        let recurrenceError: any;
        const today = dayjs().format('YYYY-MM-DD');

        if (runOnce) {
            await manager.update(TransactionRecurrenceJobDate, 1, {
                date: dayjs(dateParam)
                    .startOf('day')
                    .add(12, 'hour')
                    .toDate()
            });
            try {
                console.log(
                    `Processing grants that should occur within a month after ${dateParam}`
                );
                await processRecurringGrants(manager, true);
            } catch (error) {
                recurrenceError = error;
                console.error(error);
            }
        } else {
            await processRecurringGrantsFromDate(dateParam, manager);
        }
        if (recurrenceError) return res.status(200).send(recurrenceError);

        console.log(`finished generating grants from ${dateParam} ${runOnce ? '' : `to ${today}`}`);

        return res.status(200).send('you did it');
    });
}
