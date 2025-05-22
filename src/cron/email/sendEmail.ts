import { send, setApiKey } from '@sendgrid/mail';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { getMinuteDiffFromNow } from '../../utilities/datetime';
import { EmailQueue } from '../../models';
import { getOrCreateConnection } from '../../typeorm';
dayjs.extend(utc);
const { SENDGRID_API_KEY } = process.env;
const HOUR_5 = 300;
const DAYS_5 = 7200;

export const sendEmailsFromQueue = async () => {
    const connection = await getOrCreateConnection();
    const manager = connection.manager;
    setApiKey(SENDGRID_API_KEY);
    //get emails that are not sent and not picked up by the previous cron job
    const emailQueue = await manager
        .getRepository(EmailQueue)
        .createQueryBuilder('email_queue')
        .orderBy('email_queue.id', 'DESC')
        .where('email_queue.sent_on IS NULL')
        .andWhere('email_queue.last_tried_on IS NULL')
        .take(15)
        .getMany();
    if (emailQueue && emailQueue.length === 0) {
        //check if there are emails that are not sent and set lastTriedOn to null so that they can be retried again
        manager
            .createQueryBuilder()
            .update(EmailQueue)
            .set({ lastTriedOn: null })
            .where('email_queue.sent_on IS NULL')
            .andWhere('email_queue.team_notified_on IS NULL')
            .execute();
    } else {
        const emailQueueIds = emailQueue.map(queue => queue.id);
        //set lastTriedOn to NOW before trying to send the email
        manager
            .createQueryBuilder()
            .update(EmailQueue)
            .set({ lastTriedOn: 'NOW()' })
            .where('id IN (:...emailQueueIds)', { emailQueueIds: emailQueueIds })
            .execute();
    }
    //get list of sent emails
    const sentEmails = await manager
        .getRepository(EmailQueue)
        .createQueryBuilder('email_queue')
        .where('email_queue.sent_on IS NOT NULL')
        .getMany();
    emailQueue.map(async email => {
        let emailTo;
        let emailBody;
        try {
            emailTo = JSON.parse(email.to);
            emailBody = JSON.parse(email.bodyHtml);
        } catch (e) {}

        try {
            //emails are retried for 5 hours and if they still persist to fail update
            //teamNotifiedOn which will exclude them from being retried again
            if (!email.teamNotifiedOn && getMinuteDiffFromNow(email.createdOn) >= HOUR_5) {
                console.error(
                    `${emailBody.type}:Error Payload - ${JSON.stringify(emailBody.dynamicData)}`
                );
                manager
                    .createQueryBuilder()
                    .update(EmailQueue)
                    .set({ teamNotifiedOn: 'NOW()' })
                    .where('id = :id', { id: email.id })
                    .execute();
            } else if (!email.sentOn) {
                const emailData = {
                    templateId: emailBody.templateId,
                    from: email.from,
                    dynamicTemplateData: emailBody.dynamicData,
                    to: emailTo
                };
                if (email.bcc) {
                    emailData['bcc'] = JSON.parse(email.bcc);
                }
                await send(emailData);
                console.debug(
                    `${emailBody.type}:Success - Payload - ${JSON.stringify(emailBody.dynamicData)}`
                );
                manager
                    .createQueryBuilder()
                    .update(EmailQueue)
                    .set({ sentOn: 'NOW()' })
                    .where('id = :id', { id: email.id })
                    .execute();
            }
        } catch (err) {
            console.error(
                `${emailBody.type}: Payload - ${JSON.stringify(emailBody.dynamicData)} - Error - ${
                    err.message
                }`
            );
        }
    });
    //delete already sent emails older than 5 days
    sentEmails.map(async email => {
        if (email.sentOn && getMinuteDiffFromNow(email.createdOn) >= DAYS_5) {
            manager
                .createQueryBuilder()
                .delete()
                .from(EmailQueue)
                .where('id = :id', { id: email.id })
                .execute();
        }
    });
};
