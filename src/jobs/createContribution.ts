import axios from 'axios';
import { Record, String, Number, Boolean } from 'runtypes';
import { Task } from 'graphile-worker';

import { createContribution } from '../utilities/createContribution';
import { getOrCreateConnection } from '../typeorm';

const OneTimeInput = Record({
    payBy: String.nullable()
});

const RecurringTimingInput = Record({
    startOn: String,
    repeat: String,
    ends: String.nullable(),
    numberOfRecurrences: Number.nullable()
});

export const FundContributionInput = Record({
    fundId: String,
    userProfileAccountId: String.nullable(),
    contributeOnBehalfOfDonorUserProfileId: String.nullable().optional(),
    amount: Number,
    originalFundTransactionId: String.nullable(),
    parentRecurrenceId: String.nullable().optional(),
    scheduledDate: String.nullable().optional(),
    oneTimeGrantTiming: OneTimeInput.nullable(),
    recurringTiming: RecurringTimingInput.nullable()
});

const OverrideOptions = Record({
    isImpersonated: Boolean.optional(),
    skipEmail: Boolean.optional()
});

const CreateContributionTaskPayload = Record({
    userProfileId: String,
    userProfileAccountId: String.optional().nullable(),
    transactionTypeId: String,
    input: FundContributionInput,
    overrideOptions: OverrideOptions
});

export const triggerCreateContribution: Task = async payload => {
    const { NODE_ENV, JOB_RUNNER_URL } = process.env;
    const {
        userProfileId,
        userProfileAccountId,
        transactionTypeId,
        input,
        overrideOptions
    } = CreateContributionTaskPayload.check(payload);
    if (NODE_ENV === 'production') {
        try {
            const client = axios.create();
            await client.post(`${JOB_RUNNER_URL}/createContribution`, {
                userProfileId,
                userProfileAccountId,
                transactionTypeId,
                input,
                overrideOptions
            });
        } catch (error) {
            console.error(
                `triggerCreateContribution: Payload - ${JSON.stringify(payload)} - Error - ${
                    error.message
                }`
            );
            throw error;
        }
    } else if (NODE_ENV === 'development') {
        const connection = await getOrCreateConnection();
        await createContribution(
            connection.manager,
            userProfileId,
            userProfileAccountId,
            transactionTypeId,
            input,
            overrideOptions
        );

        return;
    }
    return;
};
