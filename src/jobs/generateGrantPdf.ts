import { dayjs } from '../utilities/datetime';
import { formatMoney } from '../pdfs/pdfUtilities';
import {
    pdfTemplateGrantsFooter,
    pdfTemplateGrantsGreeting,
    pdfTemplateGrantsHeader,
    pdfTemplateGrantsTable
} from '../pdfs/pdfTemplateGrants';
import { pdfGenerator } from '../pdfs/pdfGenerator';
import { getOrCreateConnection } from '../typeorm';
import { FundTransaction, Tenant } from '../models';
import { Record, String } from 'runtypes';
import { Task } from 'graphile-worker';
import axios, { AxiosRequestConfig, AxiosInstance } from 'axios';

export async function generateGrantPdf(id) {
    const connection = await getOrCreateConnection();
    try {
        const grant = await connection.manager
            .getRepository(FundTransaction)
            .createQueryBuilder('fundTransaction')
            .leftJoinAndSelect('fundTransaction.fund', 'fund')
            .leftJoinAndSelect('fund.fundType', 'fundType')
            .leftJoinAndSelect('fundTransaction.transactionInfo', 'transactionInfo')
            .leftJoinAndSelect('transactionInfo.recipient', 'recipient')
            .leftJoinAndSelect('recipient.contact', 'contact', 'contact.isPrimary = TRUE')
            .leftJoinAndSelect(
                'contact.primaryAddress',
                'primaryAddress',
                'primaryAddress.isPrimary = TRUE'
            )
            .leftJoinAndSelect(
                'contact.primaryEmail',
                'primaryEmail',
                'primaryEmail.isPrimary = TRUE'
            )
            .where('fundTransaction.id = :grantId', { grantId: id })
            .getOne();

        const tenant = connection.manager.getRepository(Tenant).findOne();

        // generate pdf html
        let html = '';
        const pdfFilePath = 'funds/' + grant.fund.fundCode;
        const pdfFilename =
            'GrantReceipt_' +
            dayjs(grant.transactionDateTime).format('MM-DD-YYYY') +
            '_' +
            grant.transactionInfo.recipientId +
            '_' +
            grant.id +
            '.pdf';

        const grantsTableData = {
            Amount: formatMoney(Math.abs(grant.amount)),
            Purpose: '',
            'Fund Name': grant.fund.name,
            'Special Recognition': grant.transactionInfo.specialRecognition
        };

        if (grant.transactionInfo.purposeCategory) {
            grantsTableData['Purpose'] += grant.transactionInfo.purposeCategory + '. ';
        }

        if (grant.transactionInfo.purposeNotes) {
            grantsTableData['Purpose'] = grant.transactionInfo.purposeNotes;
        }

        html += pdfTemplateGrantsHeader({
            name: grant.transactionInfo.recipient.name,
            lineOne: grant.transactionInfo.recipient.contact.primaryAddress.lineOne,
            lineTwo: grant.transactionInfo.recipient.contact.primaryAddress.lineTwo,
            lineThree: grant.transactionInfo.recipient.contact.primaryAddress.lineThree,
            city: grant.transactionInfo.recipient.contact.primaryAddress.city,
            state: grant.transactionInfo.recipient.contact.primaryAddress.state,
            postalCode: grant.transactionInfo.recipient.contact.primaryAddress.postalCode
        });
        html += pdfTemplateGrantsGreeting(grant.paidOn, grant.fund.name, grant.fund.fundType.name);
        html += pdfTemplateGrantsTable(grantsTableData);
        html += pdfTemplateGrantsFooter(grant.fund.name, grant.fund.fundType.name, tenant);

        await pdfGenerator(pdfFilePath, pdfFilename, html);
    } catch (error) {
        console.error(`generateGrantPDF: Error - ${error.message}`);
        throw error;
    }
}

const GenerateGrantPdfTaskPayload = Record({
    grantId: String
});
export const triggerGenerateGrantPdf: Task = async payload => {
    const { NODE_ENV, JOB_RUNNER_URL } = process.env;
    const { grantId } = GenerateGrantPdfTaskPayload.check(payload);
    if (NODE_ENV === 'production') {
        try {
            const client = axios.create();
            await client.post(`${JOB_RUNNER_URL}/generateGrantPDF`, {
                grantId
            });
        } catch (error) {
            console.error(
                `triggerGenerateGrantPdf: Payload - ${JSON.stringify(payload)} - Error - ${
                    error.message
                }`
            );
            throw error;
        }
    } else if (NODE_ENV === 'development') {
        return await generateGrantPdf(grantId);
    }
    return;
};
