import axios from 'axios';
import { Record, String, Boolean } from 'runtypes';
import { Task } from 'graphile-worker';

import { createGrantSeriesOccurrence } from '../cron/recurring-transactions/initiateRecurringAndFutureGrants';

export const OccurrenceOptionsRecord = Record({
    recurrenceId: String,
    nextOccurrenceDate: String,
});

const CreateContributionTaskPayload = Record({
    occurrenceOptions: OccurrenceOptionsRecord,
    skipEmail: Boolean.nullable().optional()
});

export const triggerProcessGrant: Task = async payload => {
    const { NODE_ENV, JOB_RUNNER_URL } = process.env;
    const { occurrenceOptions, skipEmail } = CreateContributionTaskPayload.check(payload);
    if (NODE_ENV === 'production') {
        try {
            const client = axios.create();
            await client.post(`${JOB_RUNNER_URL}/processGrant`, {
                occurrenceOptions,
                skipEmail
            });
        } catch (error) {
            console.error(
                `triggerProcessGrant: Payload - ${JSON.stringify(payload)} - Error - ${
                    error.message
                }`
            );
            throw error;
        }
    } else if (NODE_ENV === 'development') {
        await createGrantSeriesOccurrence(occurrenceOptions, skipEmail);

        return;
    }
    return;
};
