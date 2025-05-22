import { EntityManager } from 'typeorm';
import dayjs from 'dayjs';
import nach from 'nach2';

import { FundTransaction, GLAccount, Tenant, TransactionPayment, UserProfile } from '../models';
import { formatCurrency } from './format';
import { GrantManagementRepository } from '../repositories/GrantManagement';

export const createSingleGrantPaymentDetail = async (
    m: EntityManager,
    grant: FundTransaction,
    profile: UserProfile,
    tenant: Tenant,
    glAccount: GLAccount
): Promise<TransactionPayment> => {
    const todaysDate = dayjs().format('MM/DD/YYYY');

    let wirePayment = null;
    let checkPayment = null;
    let achPayment = null;

    const date = dayjs().format('MM/DD/YYYY');
    const timeStamp = dayjs().format('HH:mm:ss');

    const grantManagementRepo = m.getCustomRepository(GrantManagementRepository);

    const paymentType =
        grant.metadata?.paymentDetails?.paymentType?.toUpperCase() ||
        grant.transactionInfo.recipient.paymentType?.toUpperCase();

    if (paymentType === 'WIRE') {
        wirePayment = await m.save(
            m.create(TransactionPayment, {
                type: 'Wire',
                fileName: `WIRES_${date}_${timeStamp}`,
                createdBy: profile.id,
                updatedBy: profile.id,
                date: todaysDate,
                count: 1,
                amount: Math.abs(grant.amount),
                sourceAccount: glAccount.title,
                complete: false
            })
        );
    }
    if (paymentType === 'CHECK' || !paymentType) {
        checkPayment = await m.save(
            m.create(TransactionPayment, {
                type: 'Check',
                fileName: `CHECKS_${date}_${timeStamp}`,
                createdBy: profile.id,
                updatedBy: profile.id,
                date: todaysDate,
                count: 1,
                amount: Math.abs(grant.amount),
                sourceAccount: glAccount.title,
                complete: false
            })
        );
    }

    if (paymentType === 'ACH') {
        achPayment = await m.save(
            m.create(TransactionPayment, {
                type: 'ACH',
                fileName: `NACHA_${date}_${timeStamp}`,
                createdBy: profile.id,
                updatedBy: profile.id,
                date: todaysDate,
                count: 1,
                amount: Math.abs(grant.amount),
                sourceAccount: glAccount.title,
                complete: false
            })
        );
    }

    const wireDeats = !!wirePayment && {
        beneficiaryName: 'Recipient Beneficiary Name',
        beneficiaryRoutingNumber: '000000000',
        beneficiaryBankName: 'Bank of Bank'
    };
    const fileNumbQuery = await m.query("SELECT nextval('checkFileNumber')");

    const fileNumber = paymentType === 'CHECK' || !paymentType ? fileNumbQuery[0].nextval : null;
    const transactionPayment = {
        transactionPayment: {
            fileNumber,
            paymentFileId:
                paymentType === 'CHECK' || !paymentType
                    ? checkPayment.id
                    : paymentType === 'WIRE'
                    ? wirePayment.id
                    : achPayment.id,
            checkNumber:
                paymentType === 'CHECK' || !paymentType ? tenant.appSetting.checkNumber : null,
            date: todaysDate,
            payee: grant.transactionInfo.recipient.name,
            address: grant.transactionInfo.recipient.contact.primaryAddress.lineOne,
            city: grant.transactionInfo.recipient.contact.primaryAddress.city,
            state: grant.transactionInfo.recipient.contact.primaryAddress.state,
            zip: grant.transactionInfo.recipient.contact.primaryAddress.postalCode,
            amount: Math.abs(grant.amount),
            grantDetails: grant.transactionInfo.purposeNotes || '',
            memo: grant.transactionInfo.specialInstructions || '',
            dedication: grant.transactionInfo.specialRecognition || '',
            ...wireDeats
        }
    };
    if (paymentType === 'CHECK' || !paymentType) {
        grant.metadata = {
            ...grant.metadata,
            ...transactionPayment
        };
        grant.transactionPaymentId = checkPayment.id;

        // Ensure that the current status the requesting user is expecting accurately reflects the database
        tenant.appSetting.checkNumber = tenant.appSetting.checkNumber + 1;
        await m.save(tenant);
        await m.save(grant);

        return checkPayment;
    } else if (paymentType === 'ACH') {
        const achPaymentMetadata = await grantManagementRepo.generateACHMetadata(
            m,
            tenant,
            grant,
            grant.transactionInfo.recipient.id
        );

        grant.metadata = {
            ...grant.metadata,
            achPayment: achPaymentMetadata
        };
        grant.transactionPaymentId = achPayment.id;
        await m.save(grant);

        return achPayment;
    } else if (paymentType === 'WIRE') {
        // TODO: ADD when Recipient Wire details are added to system:

        grant.metadata = {
            ...grant.metadata,
            ...transactionPayment
        };
        grant.transactionPaymentId = wirePayment.id;
        await m.save(grant);

        return wirePayment;
    }
};
