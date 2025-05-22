import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { isEmail } from '../utilities/email';
import { EmailQueue } from '../models';
import { getOrCreateConnection } from '../typeorm';

const { SENDGRID_API_KEY } = process.env;
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3';

const getEmailArray = email => {
    if (!email) {
        return null;
    }
    if (Array.isArray(email)) {
        const emailRecipient = email
            .filter(e => isEmail(e))
            .map(e => ({
                email: e
            }));
        return JSON.stringify(emailRecipient);
    } else {
        return JSON.stringify([{ email: email }]);
    }
};
const checkValidEmail = email => {
    if (Array.isArray(email)) {
        return email.filter(e => isEmail(e)).length > 0;
    } else {
        return isEmail(email);
    }
};

export const send = async emailData => {
    if (checkValidEmail(emailData.to)) {
        console.debug('Adding Email to Queue : Info Payload - ', JSON.stringify(emailData));
        try {
            const connection = await getOrCreateConnection();
            const manager = connection.manager;
            await manager.save(
                manager.create(EmailQueue, {
                    to: getEmailArray(emailData.to),
                    from: emailData.from,
                    bodyHtml: JSON.stringify({
                        templateId: emailData.templateId,
                        dynamicData: emailData.dynamicTemplateData,
                        type: emailData.type
                    }),
                    bcc: getEmailArray(emailData.bcc)
                })
            );
            console.debug('Email Added to Queue : Info Payload - ', JSON.stringify(emailData));

            return true;
        } catch (e) {
            console.error('addEmailToQueue : Error', e, ' - Payload - ', JSON.stringify(emailData));
        }
    } else {
        console.error('InvalidEmail:Error Payload - ', JSON.stringify(emailData.to));
    }
};
