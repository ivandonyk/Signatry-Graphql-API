import axios from 'axios';
import { Record, String } from 'runtypes';
import { Task } from 'graphile-worker';

import { updateContribution } from '../utilities/updateContribution';
import { getOrCreateConnection } from '../typeorm';
import { FundContributionInput } from './createContribution';

const CreateContributionTaskPayload = Record({
    userProfileId: String,
    input: FundContributionInput,
    fundTxId: String
});

export const triggerUpdateContribution: Task = async payload => {
    const { NODE_ENV, JOB_RUNNER_URL } = process.env;
    const { userProfileId, input, fundTxId } = CreateContributionTaskPayload.check(payload);
    if (NODE_ENV === 'production') {
        try {
            const client = axios.create();
            await client.post(`${JOB_RUNNER_URL}/updateContribution`, {
                userProfileId,
                input,
                fundTxId
            });
        } catch (error) {
            console.error(
                `triggerUpdateContribution: Payload - ${JSON.stringify(payload)} - Error - ${
                    error.message
                }`
            );
            throw error;
        }
    } else if (NODE_ENV === 'development') {
        const connection = await getOrCreateConnection();
        await updateContribution(connection.manager, userProfileId, input, fundTxId);

        return;
    }
    return;
};
