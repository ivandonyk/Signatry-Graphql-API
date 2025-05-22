import { Job, TaskList, run, makeWorkerUtils, WorkerUtils, AddJobFunction } from 'graphile-worker';
import { triggerSendEmail } from './sendEmail';
import { triggerGenerateGrantPdf } from './generateGrantPdf';
import { triggerCreateContribution } from './createContribution';
import { triggerUpdateContribution } from './updateContribution';
import { triggerProcessGrant } from './processGrant';
import { triggerInitiateGrant } from './initiateGrant';

export enum JobType {
    SEND_EMAIL = 'SEND_EMAIL',
    GENERATE_GRANT_PDF = 'GENERATE_GRANT_PDF',
    CREATE_CONTRIBUTION = 'CREATE_CONTRIBUTION',
    UPDATE_CONTRIBUTION = 'UPDATE_CONTRIBUTION',
    PROCESS_GRANT = 'PROCESS_GRANT',
    INITIATE_GRANT = 'INITIATE_GRANT'
}

export const taskList: TaskList = {
    [JobType.SEND_EMAIL]: triggerSendEmail,
    [JobType.GENERATE_GRANT_PDF]: triggerGenerateGrantPdf,
    [JobType.CREATE_CONTRIBUTION]: triggerCreateContribution,
    [JobType.UPDATE_CONTRIBUTION]: triggerUpdateContribution,
    [JobType.PROCESS_GRANT]: triggerProcessGrant,
    [JobType.INITIATE_GRANT]: triggerInitiateGrant
};

export const handleFailedJob = (job: Job) => {
    switch (job.task_identifier) {
        case JobType.SEND_EMAIL:
            console.error(`handleFailedJob: Error sending email - ${JSON.stringify(job.payload)}`);
            break;
        case JobType.GENERATE_GRANT_PDF:
            console.error(
                `handleFailedJob: Error generating grant PDF - ${JSON.stringify(job.payload)}`
            );
            break;
        case JobType.CREATE_CONTRIBUTION:
            console.error(
                `handleFailedJob: Error creating Contribution - ${JSON.stringify(job.payload)}`
            );
            break;
        case JobType.UPDATE_CONTRIBUTION:
            console.error(
                `handleFailedJob: Error updating Contribution - ${JSON.stringify(job.payload)}`
            );
            break;
        case JobType.PROCESS_GRANT:
            console.error(
                `handleFailedJob: Error processing grant - ${JSON.stringify(job.payload)}`
            );
            break;
        case JobType.INITIATE_GRANT:
            console.error(
                `handleFailedJob: Error initiating grant - ${JSON.stringify(job.payload)}`
            );
            break;
    }
};

const connectionString = () => {
    const {
        DATABASE_CONNECTION_HOST,
        DATABASE_CONNECTION_PORT,
        DATABASE_CONNECTION_USERNAME,
        DATABASE_CONNECTION_PASSWORD,
        DATABASE_CONNECTION_DATABASE
    } = process.env;

    return `postgres://${DATABASE_CONNECTION_USERNAME}:${DATABASE_CONNECTION_PASSWORD}@${DATABASE_CONNECTION_HOST}:${DATABASE_CONNECTION_PORT}/${DATABASE_CONNECTION_DATABASE}`;
};

let graphileWorkerUtils: WorkerUtils;
const getGraphileWorkerUtils = async (): Promise<WorkerUtils> => {
    if (!graphileWorkerUtils) {
        graphileWorkerUtils = await makeWorkerUtils({
            connectionString: connectionString()
        });
    }
    return graphileWorkerUtils;
};

export const addGraphileWorkerJob = async (...jobOptions: Parameters<AddJobFunction>) => {
    const { addJob } = await getGraphileWorkerUtils();
    return await addJob(...jobOptions);
};

export async function initJobQueue() {
    // Run a worker to execute jobs:
    const runner = await run({
        connectionString: connectionString(),
        concurrency: 5,
        noHandleSignals: false,
        pollInterval: 1000,
        taskList
    });

    runner.events.on('job:failed', ({ job }) => handleFailedJob(job));

    // If the worker exits (whether through fatal error or otherwise), this promise will resolve/reject:
    await runner.promise;
}
