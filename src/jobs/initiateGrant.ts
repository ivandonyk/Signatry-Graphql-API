import axios from 'axios';
import { Record, String, Number, Boolean } from 'runtypes';
import { Task } from 'graphile-worker';

import { initiateGrant } from '../cron/recurring-transactions/initiateRecurringAndFutureGrants';

const TriggerInitiateGrantPayload = Record({
    transactionId: String,
    readyForPayoutId: String,
    readyForDivestmentId: String,
    transactionAmount: Number
});

export const triggerInitiateGrant: Task = async payload => {
    const { NODE_ENV, JOB_RUNNER_URL } = process.env;
    const {
        transactionId,
        readyForPayoutId,
        readyForDivestmentId,
        transactionAmount
    } = TriggerInitiateGrantPayload.check(payload);
    if (NODE_ENV === 'production') {
        try {
            const client = axios.create();
            await client.post(`${JOB_RUNNER_URL}/initiateGrant`, {
                transactionId,
                transactionAmount,
                readyForPayoutId,
                readyForDivestmentId
            });
        } catch (error) {
            console.error(
                `triggerInitiateGrant: Payload - ${JSON.stringify(payload)} - Error - ${
                    error.message
                }`
            );
            throw error;
        }
    } else if (NODE_ENV === 'development') {
        await initiateGrant(
            transactionId,
            transactionAmount,
            readyForPayoutId,
            readyForDivestmentId
        );

        return;
    }
    return;
};
