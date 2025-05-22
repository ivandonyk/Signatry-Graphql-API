import { Task } from 'graphile-worker';
import { Record, String, Array, Union } from 'runtypes';
import { EmailService, EmailType } from '../sendgrid';
import { getOrCreateConnection } from '../typeorm';
import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';

const GrantEmailPayload = Record({
    grantId: String
});

const SendEmailsPayload = Record({
    emailType: String,
    emailData: Union(GrantEmailPayload) // Can add more payload types here
});
export async function sendEmail(emailType, emailData) {
    const emailService = new EmailService();
    const connection = await getOrCreateConnection();

    try {
        switch (emailType) {
            case EmailType.GRANT_PAID_DONOR:
                await emailService.sendGrantPaidDonorNotification(
                    connection.manager,
                    emailData.grantId,
                    true
                );
                break;
            case EmailType.GRANT_PAID_RECIPIENT:
                await emailService.sendGrantPaidNotification(
                    connection.manager,
                    emailData.grantId,
                    true
                );
                break;
            case EmailType.GRANT_PAID_LAST_IN_SERIES:
                await emailService.sendGrantPaidLastInSeries(
                    connection.manager,
                    emailData.grantId,
                    true
                );
                break;
            default:
                return;
        }
    } catch (error) {
        console.error(`sendEmail: Error - Type: ${emailType}, Message: ${error.message}`);
        throw error;
    }
}

export const triggerSendEmail: Task = async (payload, helpers) => {
    const { NODE_ENV, JOB_RUNNER_URL } = process.env;
    const { emailType, emailData } = SendEmailsPayload.check(payload);
    if (NODE_ENV === 'production') {
        try {
            const client = axios.create();
            await client.post(`${JOB_RUNNER_URL}/sendEmail`, {
                emailType,
                emailData
            });
        } catch (error) {
            console.error(`triggerSendEmail: Error - ${error.message}`);
            throw error;
        }
    } else if (NODE_ENV === 'development') {
        return await sendEmail(emailType, emailData);
    }
    return;
};
