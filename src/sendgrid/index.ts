import { NotificationType } from './../models/Notification';
import { send } from './SendGridClient';
import {
    FundTransaction,
    FundTransactionDetail,
    RecipientContactAddress,
    RecipientContactPhone,
    Tenant,
    AppUser,
    UserProfile,
    InstitutionAccount,
    Fund
} from '../models';
import { EntityManager } from 'typeorm';
import dayjs from 'dayjs';
import { formatCurrency } from '../utilities/format';
import { AdvisorIMAInput } from '../inputs/IMA/AdvisorIMAInput';
import { MoneyMovementInstructionsInput } from '../inputs/Batch/MoneyMovementInstructionsInput';
import {
    convertRRuleFromString,
    getAllDatesArrayForRRule
} from '../utilities/getRruleForRecurringActions';
import { shouldSendNotification } from '../utilities/email';

const {
    BASE_URL,
    SENDGRID_TEMPLATE_ID_FUND_CONTRIBUTION_CREATED_TENANT,
    SENDGRID_TEMPLATE_ID_FUND_CONTRIBUTION_CREATED_OWNER,
    SENDGRID_TEMPLATE_ID_GRANT_RECOMMENDATION_CREATED_TENANT,
    SENDGRID_TEMPLATE_ID_GRANT_PAID_DONOR_NOTIFICATION,
    SENDGRID_TEMPLATE_ID_LAST_GRANT_IN_SERIES_PAID,
    SENDGRID_TEMPLATE_ID_FUND_CONTRIBUTION_TAX_RECEIPT,
    SENDGRID_TEMPLATE_ID_IMA_SUCCESSFULLY_LINKED,
    SENDGRID_TEMPLATE_ID_MONEY_MOVEMENT_INSTRUCTIONS,
    SENDGRID_FORGOT_USERNAME,
    SENDGRID_ADMIN_EMAIL_INVITATION,
    SENDGRID_NEW_FUND_USER_INVITATION,
    SENDGRID_NEW_FUND_USER_ALERT,
    SENDGRID_IMA_REQUEST,
    SENDGRID_TEMPLATE_ID_GRANT_PAID,
    SENDGRID_CHANGE_PASSWORD_NOTIFICATION,
    SENDGRID_CHANGE_PASSWORD_BY_ADMIN_NOTIFICATION,
    SENDGRID_CHANGE_SETTINGS_NOTIFICATION,
    SENDGRID_NEW_FUNDING_SOURCE_NOTIFICATION,
    SENDGRID_NEW_FUND_OPENED_NOTIFICATION,
    SENDGRID_CONTRIBUTION_POSTED_FUNDHOLDER_NOTIFICATION,
    SENDGRID_CONTRIBUTION_POSTED_DONOR_NOTIFICATION,
    SENDGRID_CONTRIBUTION_STOCK_GIFT_RECEIVED_NOTIFICATION
} = process.env;

const SIGNIFICANT_DIGITS = 2;

export enum EmailType {
    GRANT_PAID_RECIPIENT = 'GRANT_PAID_RECIPIENT_NOTIFICATION',
    GRANT_PAID_DONOR = 'GRANT_PAID_DONOR_NOTIFICATION',
    GRANT_PAID_LAST_IN_SERIES = 'GRANT_PAID_LAST_IN_SERIES'
}

export class EmailService {
    /**
     * Method to get any email from tenant.appSetting
     * @param manager
     * @param emailProperty // property that you want to get eg: bccEmail or fromEmail
     */
    private async getTenantEmail(manager: EntityManager, emailProperty: string): Promise<string> {
        const tenant = (await manager.find(Tenant))[0];
        const email = tenant.appSetting[emailProperty] || '';
        return email;
    }

    private async getTenantFromEmailAddress(manager: EntityManager): Promise<string> {
        const tenant = (await manager.find(Tenant))[0];
        if (!tenant.appSetting.fromEmail) throw Error('Tenant.appSetting.fromEmail is null');
        return tenant.appSetting.fromEmail;
    }

    private async getTenantEmailAddress(manager: EntityManager): Promise<string> {
        //Get tenant and check to make sure email exists
        const tenant = (await manager.find(Tenant))[0];
        if (!tenant.appSetting.email) throw Error('Tenant.appSetting.email is null');

        //Return tenant email address
        return tenant.appSetting.email;
    }
    private async getTenant(manager: EntityManager): Promise<Tenant> {
        //Get tenant and check to make sure email exists
        const tenant = (await manager.find(Tenant))[0];

        return tenant;
    }

    async sendForgotUsernameEmails(manager: EntityManager, appUser: AppUser, throwError = false) {
        const user = await manager.findOne(UserProfile, { appUserId: appUser.id });
        const tenant = await this.getTenant(manager);
        const data = {
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            username: appUser.username,
            firstname: user.firstName,
            //    TODO: add tenant url to tenant app settings
            url: `${BASE_URL}/log-in`
        };
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        try {
            await send({
                templateId: SENDGRID_FORGOT_USERNAME,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: appUser.emailAddress,
                type: 'sendForgotUsernameEmails'
            });
        } catch (err) {
            console.error(
                `sendForgotUsernameEmails: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendNewFundUserAlertToFundHolders(
        manager: EntityManager,
        username: string,
        email: string,
        fundRole: string,
        fundRelationship: string,
        fundName: string,
        throwError = false
    ) {
        // get from email
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        // gen tenant
        const tenant = await this.getTenant(manager);
        // data for the invitation email
        const data = {
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            fundRole,
            fundRelationship,
            fundName,
            username
        };
        // send email
        try {
            await send({
                templateId: SENDGRID_NEW_FUND_USER_ALERT,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: email,
                type: 'sendNewFundUserAlertToFundHolders'
            });
        } catch (err) {
            console.error(
                `sendNewFundUserAlertToFundHolders: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendFundInvitationEmails(
        manager: EntityManager,
        code: string,
        email: string,
        fundName: string,
        fundType: string,
        throwError = false
    ) {
        // get from email
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        // gen tenant
        const tenant = await this.getTenant(manager);
        // data for the invitation email
        const data = {
            url: `${BASE_URL}/signup?code=${code}&email=${email}`,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            fundName,
            fundType
        };
        // send email
        try {
            await send({
                templateId: SENDGRID_NEW_FUND_USER_INVITATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: email,
                type: 'sendFundInvitationEmails'
            });
        } catch (err) {
            console.error(
                `sendFundInvitationEmails: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendAdminInvitationEmails(
        manager: EntityManager,
        code: string,
        email: string,
        role: string,
        throwError = false
    ) {
        // get from email
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        // gen tenant
        const tenant = await this.getTenant(manager);
        // data for the invitation email
        const data = {
            url: `${BASE_URL}/signup?code=${code}&email=${email}${
                role === 'Financial Advisor' ? '&fa=true' : ''
            }`,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            role: role,
            normalUser: role === 'Donor' ? true : false
        };
        // send email
        try {
            await send({
                templateId: SENDGRID_ADMIN_EMAIL_INVITATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: email,
                type: 'sendAdminInvitationEmails'

            });
        } catch (err) {
            console.error(
                `sendAdminInvitationEmails: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendAdminUserCreatedInvitationEmails(
        manager: EntityManager,
        email: string,
        username: string,
        firstName: string,
        lastName: string,
        role: string,
        phoneNumber?: string,
        throwError = false
    ) {
        // get from email
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        // gen tenant
        const tenant = await this.getTenant(manager);
        // data for the invitation email
        const data = {
            url: `${BASE_URL}/signup?username=${username}&email=${email}&fn=${firstName}&ln=${lastName}${(phoneNumber &&
                `&pn=${phoneNumber}`) ||
                ''}&userExists=true`,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            role: role,
            normalUser: role === 'Donor' ? true : false
        };
        // send email
        try {
            await send({
                templateId: SENDGRID_ADMIN_EMAIL_INVITATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: email,
                type: 'sendAdminUserCreatedInvitationEmails'
            });
        } catch (err) {
            console.error(
                `sendAdminUserCreatedInvitationEmails: Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendGrantRecommendationCreatedEmails(
        manager: EntityManager,
        fundTransactionId: string,
        throwError = false
    ) {
        //Get grant recommendation from db

        // Fund transaction
        const transaction = await manager.findOne(FundTransaction, fundTransactionId, {
            relations: [
                'fund',
                'fund.createdByUserProfile',
                'fund.createdByUserProfile.emails',
                'transactionInfo',
                'transactionInfo.recipient',
                'transactionInfo.recipient.contact'
            ]
        });

        const destination = transaction.transactionInfo;

        // get user profile for transaction
        const userProfile = await manager.findOne(UserProfile, transaction.createdBy, {
            //Let typeorm auto-populate nested entities needed for sending email
            relations: ['emails', 'primaryEmail']
        });

        const tenant = await this.getTenant(manager);

        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);

        let requestedProcessDate = dayjs(destination.requestedProcessDate).format('MM/DD/YYYY');
        if (destination.requestedProcessDate === null) {
            requestedProcessDate = 'As Soon As Possible';
        } else {
            requestedProcessDate = dayjs(destination.requestedProcessDate).format('MM/DD/YYYY');
        }

        if (!!destination.recipient) {
            const recipient = destination.recipient;
            const contact = recipient.contact;

            // Get primary address
            const address = await manager
                .getRepository(RecipientContactAddress)
                .findOne({ recipientContactId: contact.id, isPrimary: true });

            // Get primary phone
            const phone = await manager
                .getRepository(RecipientContactPhone)
                .findOne({ recipientContactId: contact.id, isPrimary: true });

            const data = {
                firstname: userProfile.firstName,
                fundName: transaction.fund.name,
                url: `${BASE_URL}/funds/grant-history?fund=${transaction.fund.fundCode}&grantId=${transaction.id}`,
                tenant: tenant.name,
                tenantPhone: tenant.phone,
                tenantUrl: tenant.url,
                tenantAddressLineOne: tenant.addressLineOne,
                tenantAddressCityStateZip: tenant.cityStateZip,
                transactionCode: transaction.transactionCode,
                requestedProcessDate,
                createdOn: dayjs(transaction.createdOn).format('MM/DD/YYYY'),
                fundId: transaction.fund.fundCode,
                amount: Math.abs(transaction.amount).toFixed(SIGNIFICANT_DIGITS),
                grantRecipient: recipient.name,
                ein: recipient.ein,
                contactName: contact.orgContactName,
                phone: phone.value,
                address1: address.lineOne,
                city: address.city,
                state: address.state,
                zip: address.postalCode,
                specificNeed: destination.purposeNotes || 'Where needed most',
                specialInstructions: destination.specialInstructions,
                specialRecognition: destination.specialRecognition
            };

            // Send owner email
            try {
                await send({
                    from: tenantFromEmail,
                    to: userProfile.emails.map(e => e.value),
                    templateId: SENDGRID_TEMPLATE_ID_GRANT_RECOMMENDATION_CREATED_TENANT,
                    dynamicTemplateData: data,
                    type: 'sendGrantRecommendationCreatedEmails'

                });
            } catch (err) {
                console.error(
                    `sendGrantRecommendationCreatedEmails: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                        data
                    )} - Error - ${err.message}`
                );
                if (throwError) {
                    throw err;
                }
            }

            //Send tenant email
            try {
                await send({
                    from: tenantFromEmail,
                    to: tenantFromEmail,
                    templateId: SENDGRID_TEMPLATE_ID_GRANT_RECOMMENDATION_CREATED_TENANT,
                    dynamicTemplateData: data,
                    type: 'sendGrantRecommendationCreatedEmails'
                });
            } catch (err) {
                console.error(
                    `sendGrantRecommendationCreatedEmails: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                        data
                    )} - Error - ${err.message}`
                );
                if (throwError) {
                    throw err;
                }
            }
        } else {
            let grantRecipient = transaction.transactionInfo.recipient?.name;
            // if grant doesn't yet have a recipient, check the metadata
            if (!grantRecipient) {
                grantRecipient = transaction.metadata?.recipientInfo?.recipientName || 'Other';
            }

            const data = {
                firstname: userProfile.firstName,
                fundName: transaction.fund.name,
                url: `${BASE_URL}/funds/grant-history?fund=${transaction.fund.fundCode}&grantId=${transaction.id}`,
                tenant: tenant.name,
                tenantPhone: tenant.phone,
                tenantUrl: tenant.url,
                requestedProcessDate,
                transactionCode: transaction.transactionCode,
                createdOn: dayjs(transaction.createdOn).format('MM/DD/YYYY'),
                fundId: transaction.fund.fundCode,
                amount: Math.abs(transaction.amount).toFixed(SIGNIFICANT_DIGITS),
                specificNeed: destination.purposeNotes || 'Where needed most',
                specialInstructions: destination.specialInstructions,
                specialRecognition: destination.specialRecognition,
                grantRecipient,
                personalNote: transaction.transactionInfo.purposeNotes
            };

            // Send owner email
            try {
                await send({
                    from: tenantFromEmail,
                    to: userProfile.emails.map(e => e.value),
                    templateId: SENDGRID_TEMPLATE_ID_GRANT_RECOMMENDATION_CREATED_TENANT,
                    dynamicTemplateData: data,
                    type: 'sendGrantRecommendationCreatedEmails'
                });
            } catch (err) {
                console.error(
                    `sendGrantRecommendationCreatedEmails: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                        data
                    )} - Error - ${err.message}`
                );
                if (throwError) {
                    throw err;
                }
            }

            //Send tenant email
            try {
                await send({
                    from: tenantFromEmail,
                    to: tenantFromEmail,
                    templateId: SENDGRID_TEMPLATE_ID_GRANT_RECOMMENDATION_CREATED_TENANT,
                    dynamicTemplateData: data
                });
            } catch (err) {
                console.error(
                    `sendGrantRecommendationCreatedEmails: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                        data
                    )} - Error - ${err.message}`
                );
                if (throwError) {
                    throw err;
                }
            }
        }
    }

    async sendGrantPaidLastInSeries(
        manager: EntityManager,
        fundTransactionId: string,
        throwError = false
    ) {
        const tenant = await this.getTenant(manager);

        const tenantEmail = await this.getTenantEmailAddress(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);

        const grantToCheck = await manager
            .getRepository(FundTransaction)
            .createQueryBuilder('fundTransaction')
            .leftJoinAndSelect('fundTransaction.transactionRecurrence', 'transactionRecurrence')
            .where('fundTransaction.id = :fundTransactionId', {
                fundTransactionId: fundTransactionId
            })
            .getOne();

        let lastInSeries = false;

        if (
            !!grantToCheck.transactionRecurrence &&
            grantToCheck.transactionRecurrence.recurrenceRule !== null
        ) {
            const rrule = convertRRuleFromString(grantToCheck.transactionRecurrence.recurrenceRule);

            const allDates = getAllDatesArrayForRRule(rrule);

            if (
                dayjs(allDates[allDates.length - 1]).format('MM/DD/YYYY') ===
                dayjs(grantToCheck.scheduledDate).format('MM/DD/YYYY')
            ) {
                lastInSeries = true;
            }
        }
        if (!lastInSeries) {
            return;
        }

        const transaction = await manager
            .getRepository(FundTransaction)
            .createQueryBuilder('fundTransaction')
            .leftJoinAndSelect('fundTransaction.fund', 'fund')
            .leftJoinAndSelect('fund.createdByUserProfile', 'createdByUserProfile')
            .leftJoinAndSelect('createdByUserProfile.emails', 'emails')
            .leftJoinAndSelect('fundTransaction.transactionInfo', 'transactionInfo')
            .leftJoinAndSelect('transactionInfo.recipient', 'recipient')
            .leftJoinAndSelect('recipient.contact', 'contact', 'contact.isPrimary = TRUE')
            .where('fundTransaction.id = :fundTransactionId', {
                fundTransactionId: fundTransactionId
            })
            .getOne();

        const destination = transaction.transactionInfo;

        // get user profile for transaction
        const userProfile = await manager.findOne(UserProfile, transaction.createdBy, {
            //Let typeorm auto-populate nested entities needed for sending email
            relations: ['emails', 'primaryEmail']
        });

        const recipient = destination.recipient;
        const contact = recipient.contact;

        // Get primary address
        const address = await manager
            .getRepository(RecipientContactAddress)
            .findOne({ recipientContactId: contact.id, isPrimary: true });

        // Get primary phone
        const phone = await manager
            .getRepository(RecipientContactPhone)
            .findOne({ recipientContactId: contact.id, isPrimary: true });

        const data = {
            grantRecipient: recipient.name,
            fundName: transaction.fund.name,
            firstname: userProfile.firstName,
            availableBalance: transaction.fund.availableBalance,
            transactionCode: transaction.transactionCode,
            transactionRecurrenceVersion: transaction.transactionRecurrence.version,
            fundTransactionScheduledDate: transaction.scheduledDate,
            seriesEndDate: transaction.scheduledDate, // not right
            amount: Math.abs(transaction.amount).toFixed(SIGNIFICANT_DIGITS),
            ein: recipient.ein,
            address1: address.lineOne,
            city: address.city,
            state: address.state,
            zip: address.postalCode,
            specialRecognition: destination.specialRecognition,
            specificNeed: destination.purposeNotes || 'Where needed most',
            specialInstructions: destination.specialInstructions,
            url: `${BASE_URL}/funds/grant-history?fund=${transaction.fund.fundCode}&grantId=${transaction.id}`,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            createdOn: dayjs(transaction.createdOn).format('MM/DD/YYYY'),
            fundId: transaction.fund.fundCode,
            contactName: contact.orgContactName,
            phone: phone.value
        };

        // Send owner email
        try {
            await send({
                from: tenantFromEmail,
                to: userProfile.emails.map(e => e.value),
                templateId: SENDGRID_TEMPLATE_ID_LAST_GRANT_IN_SERIES_PAID,
                dynamicTemplateData: data,
                type: 'sendGrantPaidLastInSeries'
            });
        } catch (err) {
            console.error(
                `sendGrantPaidLastInSeries: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        }

        //Send tenant email
        try {
            await send({
                from: tenantFromEmail,
                to: tenantEmail,
                templateId: SENDGRID_TEMPLATE_ID_LAST_GRANT_IN_SERIES_PAID,
                dynamicTemplateData: data,
                type: 'sendGrantPaidLastInSeries'
            });
        } catch (err) {
            console.error(
                `sendGrantPaidLastInSeries: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendGrantPaidDonorNotification(
        manager: EntityManager,
        fundTransactionId: string,
        throwError = false
    ) {
        //Get grant recommendation from db

        // Fund transaction
        const transaction = await manager
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
            .where('fundTransaction.id = :fundTransactionId', {
                fundTransactionId: fundTransactionId
            })
            .getOne();

        const destination = transaction.transactionInfo;

        // get user profile for transaction
        const userProfile = await manager.findOne(UserProfile, transaction.createdBy, {
            //Let typeorm auto-populate nested entities needed for sending email
            relations: ['emails', 'primaryEmail']
        });

        const tenant = await this.getTenant(manager);

        const tenantEmail = await this.getTenantEmailAddress(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);

        const recipient = destination.recipient;

        const data = {
            amount: Math.abs(transaction.amount).toFixed(SIGNIFICANT_DIGITS),
            grantRecipient: recipient.name,
            fundName: transaction.fund.name,
            url: `${BASE_URL}/funds/grant-history?fund=${transaction.fund.fundCode}&grantId=${transaction.id}`,
            tenantEmail,
            tenantPhone: tenant.phone,
            tenant: tenant.name,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip
        };

        // Send owner email
        try {
            await send({
                from: tenantFromEmail,
                to: userProfile.emails.map(e => e.value),
                templateId: SENDGRID_TEMPLATE_ID_GRANT_PAID_DONOR_NOTIFICATION,
                dynamicTemplateData: data,
                type: 'sendGrantPaidDonorNotification'
            });
        } catch (err) {
            console.error(
                `sendGrantPaidDonorNotification: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        }

        //Send tenant email
        try {
            await send({
                from: tenantFromEmail,
                to: tenantEmail,
                templateId: SENDGRID_TEMPLATE_ID_GRANT_PAID_DONOR_NOTIFICATION,
                dynamicTemplateData: data,
                type: 'sendGrantPaidDonorNotification'
            });
        } catch (err) {
            console.error(
                `sendGrantPaidDonorNotification: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendFundContributionCreatedEmails(
        manager: EntityManager,
        fundTransactionId: string,
        throwError = false
    ) {
        //Retrieve contribution from db
        const contribution = await manager.findOne(FundTransaction, fundTransactionId, {
            //Let typeorm auto-populate nested entities needed for sending email
            relations: [
                'fund',
                'fund.investments',
                'fund.investments.investment',
                'fund.createdByUserProfile',
                'fund.createdByUserProfile.emails',
                'fund.createdByUserProfile.addresses'
            ]
        });

        // Tenant information
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        const tenantEmail = await this.getTenantEmailAddress(manager);
        const tenant = await this.getTenant(manager);
        const userProfile = await manager.findOne(UserProfile, contribution.createdBy, {
            //Let typeorm auto-populate nested entities needed for sending email
            relations: ['emails', 'primaryEmail']
        });

        //Generate data for SendGrid
        const data = {
            firstname: userProfile.firstName,
            url: `${BASE_URL}/${userProfile.id}/contributions`,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            transactionCode: contribution.transactionCode,
            amount: contribution.amount.toFixed(SIGNIFICANT_DIGITS),
            createdOn: dayjs(contribution.createdOn).format('MM/DD/YYYY'),
            investmentPoolAllocations: contribution.fund.investments.map(i => {
                const amount = contribution.amount * i.allocationPercentage;
                return [
                    {
                        amount: amount.toFixed(SIGNIFICANT_DIGITS),
                        name: i.investment.name
                    }
                ];
            })
        };

        // Send notification to fund donor's
        try {
            await send({
                templateId: SENDGRID_TEMPLATE_ID_FUND_CONTRIBUTION_CREATED_OWNER,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                //Send to all email addresses associated with the fund owner
                to: userProfile.emails.map(e => e.value),
                type: 'sendFundContributionCreatedEmails'
            });
        } catch (err) {
            console.error(
                `sendFundContributionCreatedEmails: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            }
        }

        //Send to tenant
        await send({
            templateId: SENDGRID_TEMPLATE_ID_FUND_CONTRIBUTION_CREATED_TENANT,
            from: tenantFromEmail,
            dynamicTemplateData: data,
            to: tenantEmail,
            type: 'sendFundContributionCreatedEmails'
        }).catch(err => {
            console.error(
                `sendFundContributionCreatedEmails: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            }
        });
    }
    async sendFundContributionTaxReceipts(
        manager: EntityManager,
        cashDetailId: string,
        feeDetailId: string,
        throwError = false
    ) {
        //Retrieve contribution from db
        const cashDetail = await manager.findOne(FundTransactionDetail, cashDetailId, {
            //Let typeorm auto-populate nested entities needed for sending email
            relations: [
                'fundTransaction',
                'fundTransaction.fund',
                'fundTransaction.fund.createdByUserProfile',
                'fundTransaction.fund.createdByUserProfile.emails',
                'fundTransaction.fund.createdByUserProfile.addresses'
            ]
        });
        const feeDetail = await manager.findOne(FundTransactionDetail, feeDetailId);

        // Tenant information
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        const tenant = await this.getTenant(manager);
        const { createdByUserProfile } = cashDetail.fundTransaction.fund;
        const userProfile = await manager.findOne(
            UserProfile,
            cashDetail.fundTransaction.createdBy,
            {
                //Let typeorm auto-populate nested entities needed for sending email
                relations: ['emails', 'primaryEmail']
            }
        );
        const primaryAddress = createdByUserProfile.addresses.find(address => address.isPrimary);

        const amountWithFee = cashDetail.amount + feeDetail.amount;
        const taxReceiptData = {
            firstname: userProfile.firstName,
            url: `${BASE_URL}/funds/contribution-history?fund=${cashDetail.fundTransaction.fund.fundCode}`,
            date: dayjs(cashDetail.fundTransaction.createdOn).format('MM/DD/YYYY'),
            amount: amountWithFee.toFixed(SIGNIFICANT_DIGITS),
            // TODO: replace with actual value once more than 1 type exists
            asset: 'Cash',
            totalAmount: cashDetail.fundTransaction.amount.toFixed(SIGNIFICANT_DIGITS),
            donorName: null,
            fundId: cashDetail.fundTransaction.fund.fundCode,
            transactionCode: cashDetail.fundTransaction.transactionCode,
            fundName: cashDetail.fundTransaction.fund.name,
            signatry: true,
            donorAddress1: null,
            donorAddress2: null,
            donorCity: null,
            donorSt: null,
            donorZip: null,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip
        };

        if (primaryAddress) {
            taxReceiptData.donorAddress1 = primaryAddress.lineOne;
            if (primaryAddress.lineTwo) {
                taxReceiptData.donorAddress2 = primaryAddress.lineTwo;
            }
            taxReceiptData.donorCity = primaryAddress.city;
            taxReceiptData.donorSt = primaryAddress.state;
            taxReceiptData.donorZip = primaryAddress.postalCode;
        }

        if (createdByUserProfile.firstName && createdByUserProfile.lastName) {
            taxReceiptData.donorName = `${createdByUserProfile.firstName} ${createdByUserProfile.lastName}`;
        }

        // Send tax receipt to fund donor's
        try {
            await send({
                templateId: SENDGRID_TEMPLATE_ID_FUND_CONTRIBUTION_TAX_RECEIPT,
                from: tenantFromEmail,
                dynamicTemplateData: taxReceiptData,
                //Send to all email addresses associated with the fund owner
                to: userProfile.emails.map(e => e.value),
                type: 'sendFundContributionTaxReceipts'
            });
        } catch (err) {
            console.error(
                `sendFundContributionTaxReceipts: Payload - ${JSON.stringify(
                    taxReceiptData
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendIMASuccessfullyLinkedEmails(
        manager: EntityManager,
        { custodianName, accountNumber, displayName, marketValue }: InstitutionAccount,
        fund: Fund,
        throwError = false
    ) {
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        const userProfile = await manager.findOne(UserProfile, fund.createdBy, {
            relations: ['emails', 'primaryEmail']
        });

        const imaData = {
            name: `${userProfile.firstName} ${userProfile.lastName}`,
            ima: {
                custodianName,
                accountNumber,
                displayName,
                marketValue: `$${formatCurrency(marketValue)}`
            },
            fund: {
                name: fund.name
            },
            url: `${BASE_URL}/funds/dashboard?fund=${fund.fundCode}`
        };

        try {
            await send({
                templateId: SENDGRID_TEMPLATE_ID_IMA_SUCCESSFULLY_LINKED,
                from: tenantFromEmail,
                dynamicTemplateData: imaData,
                to: userProfile.emails.map(email => email.value),
                type: 'sendIMASuccessfullyLinkedEmails'
            });
        } catch (err) {
            console.error(
                `sendIMASuccessfullyLinkedEmails: Payload - ${JSON.stringify(imaData)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendIMARequestNotification(
        manager: EntityManager,
        input: AdvisorIMAInput,
        donorName: string,
        throwError = false
    ) {
        // Tenant information
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        const tenant = await this.getTenant(manager);

        const data = {
            fundName: input.fundName,
            fundCode: input.fundCode,
            donorName,
            financialAdvisorName: input.advisorFullName,
            officeName: null,
            institution: null,
            email: input.advisorEmail,
            phoneNumber: null,
            address: !!input.advisorAddress,
            addressLineOne: null,
            addressLineTwo: null,
            city: null,
            state: null,
            zip: null,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip
        };

        if (input.advisorAddress) {
            data.addressLineOne = input.advisorAddress.address1;
            data.city = input.advisorAddress.city;
            data.state = input.advisorAddress.state;
            data.zip = input.advisorAddress.zip;
            if (input.advisorAddress.address2) {
                data.addressLineTwo = input.advisorAddress.address2;
            }
        }

        if (input.advisorOfficeName) {
            data.officeName = input.advisorOfficeName;
        }

        if (input.advisorInstitutionName) {
            data.institution = input.advisorInstitutionName;
        }

        if (input.advisorPhoneNumber) {
            data.phoneNumber = input.advisorPhoneNumber;
        }

        if (tenant.appSetting.investmentToEmail) {
            const emailP = []; // push emails to promises array

            tenant.appSetting.investmentToEmail.forEach(emailAddress => {
                // Send tax receipt to fund donor's
                emailP.push(
                    send({
                        templateId: SENDGRID_IMA_REQUEST,
                        from: tenantFromEmail,
                        dynamicTemplateData: data,
                        to: emailAddress,
                        type: 'sendIMARequestNotification'
                    }).catch(err => {
                        console.error(
                            `sendIMARequestNotification: Payload - ${JSON.stringify(
                                data
                            )} - Error - ${err.message}`
                        );
                        if (throwError) {
                            throw err;
                        }
                    })
                );
            });
            await Promise.all(emailP);
        }
    }
    async sendMoneyMovementInstructions(
        manager: EntityManager,
        input: MoneyMovementInstructionsInput,
        throwError = false
    ) {
        // Tenant information
        // NOTE: tenantEmail is a non bouncy email address
        const tenantEmail = await this.getTenantEmailAddress(manager);
        const tenant = await this.getTenant(manager);

        const data = {
            accountName: input.accountName,
            isIMA: input.isIMA,
            invoiceURL: `${BASE_URL}/invoice/${input.batchId}`,
            fileUrl: `${BASE_URL}/downloads/Signatry-SMA-funding-instructions.pdf`,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantEmail,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip
        };

        // Send tax receipt to fund donor's
        try {
            await send({
                templateId: SENDGRID_TEMPLATE_ID_MONEY_MOVEMENT_INSTRUCTIONS,
                from: tenantEmail,
                dynamicTemplateData: data,
                to: input.toEmail,
                bcc: tenantEmail,
                type: 'sendMoneyMovementInstructions'
            });
            console.debug(`sendMoneyMovementInstructions: Request - ${input.toEmail} -  ${JSON.stringify(data)}`)
        } catch (err) {
            console.error(
                `sendMoneyMovementInstructions: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendGrantPaidNotification(
        manager: EntityManager,
        fundTransactionId: string,
        throwError = false
    ) {
        const grant = await manager
            .getRepository(FundTransaction)
            .createQueryBuilder('fundTransaction')
            .leftJoinAndSelect('fundTransaction.fund', 'fund')
            .leftJoinAndSelect('fund.fundType', 'fundType')
            .leftJoinAndSelect('fundTransaction.transactionInfo', 'transactionInfo')
            .leftJoinAndSelect('transactionInfo.recipient', 'recipient')
            .leftJoinAndSelect('recipient.contact', 'contact', 'contact.isPrimary = TRUE')
            .leftJoinAndSelect('recipient.contacts', 'contacts')
            .leftJoinAndSelect(
                'contact.primaryAddress',
                'primaryAddress',
                'primaryAddress.isPrimary = TRUE'
            )
            .leftJoinAndSelect('contacts.emails', 'emails')
            .where('fundTransaction.id = :fundTransactionId', {
                fundTransactionId: fundTransactionId
            })
            .getOne();

        // Tenant information
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        const bccEmail = await this.getTenantEmail(manager, 'bccEmail');
        // const tenant = await this.getTenant(manager);

        const {
            specialRecognition,
            purposeNotes,
            includeFundNameInRecognition
        } = grant.transactionInfo;
        const { paymentType, name, contacts, id } = grant.transactionInfo.recipient;
        const { primaryAddress } = grant.transactionInfo.recipient.contact;

        /** @todo uncomment out fundholder information */

        const data = {
            fundName: includeFundNameInRecognition ? grant.fund.name : null,
            grantRecipient: name,
            recipientAddress1: primaryAddress.lineOne,
            recipientAddress2: primaryAddress.lineTwo,
            recipientCity: primaryAddress.city,
            recipientState: primaryAddress.state,
            recipientZip: primaryAddress.postalCode,
            paymentType: paymentType,
            amount: Math.abs(grant.amount).toFixed(SIGNIFICANT_DIGITS),
            grantId: grant.transactionCode,
            recognition: specialRecognition,
            createdOn: dayjs(grant.paidOn).format('MM/DD/YYYY'),
            signatry: true,
            purposeNotes,
            specialRecognition
        };

        const sendNotification = await shouldSendNotification(
            manager,
            id,
            NotificationType.GRANT_PAID,
            grant.fund.id
        );


        // Since we have production email addressed stores, sending email to recipient is disabled on DEVELOPMENT.
        if (process.env.NODE_ENV === 'production') {
            for (const contact of contacts) {
                if (contact.isGrantContact) {
                    for (const email of contact.emails) {
                        // If we have this env set, DO NOT USE the grant recipient email (to prevent spam)
                        // Once we go live, we can remove this env and the real email address will be used
                        const emailTo = email.value || process.env.RECIPIENT_CONTACT_EMAIL;
                        // Send notification to grant recipient
                        if (sendNotification && emailTo) {
                            try {
                                await send({
                                    templateId: SENDGRID_TEMPLATE_ID_GRANT_PAID,
                                    from: tenantFromEmail,
                                    dynamicTemplateData: data,
                                    to: emailTo,
                                    bcc: bccEmail,
                                    type: 'sendGrantPaidNotification'
                                });
                            } catch (err) {
                                console.error(
                                    `sendGrantPaidNotification: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                                        data
                                    )} - Error - ${err.message}`
                                );
                            }
                        }else{
                            console.debug(`
                                sendGrantPaidNotification: Info - Notification Preference: ${sendNotification} - Valid Email: ${emailTo}
                            `)
                        }
                    }
                }else{
                    console.debug(`
                        sendGrantPaidNotification: Info - isNotGrantContact - Payload - ${JSON.stringify(contact)}
                    `)
                }
            }
        } else if (process.env.NODE_ENV === 'development') {
            const emailTo = process.env.RECIPIENT_CONTACT_EMAIL;
            // Send notification to registered ENV email if exists
            // We don't send the BBC field here, is just for production environment
            if (emailTo) {
                try {
                    await send({
                        templateId: SENDGRID_TEMPLATE_ID_GRANT_PAID,
                        from: tenantFromEmail,
                        dynamicTemplateData: data,
                        to: emailTo,
                        bcc: bccEmail,
                        type: 'sendGrantPaidNotification'
                    });
                } catch (err) {
                    console.error(
                        `sendGrantPaidNotification: Grant ID - ${fundTransactionId} - Payload - ${JSON.stringify(
                            data
                        )} - Error - ${err.message}`
                    );
                    if (throwError) {
                        throw err;
                    }
                }
            }
        }
    }

    async sendChangePasswordNotification(
        manager: EntityManager,
        emailAddress: string,
        throwError = false
    ) {
        const tenant = await this.getTenant(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);

        const data = {
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            url: `${BASE_URL}/log-in`
        };
        try {
            return await send({
                templateId: SENDGRID_CHANGE_PASSWORD_NOTIFICATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: emailAddress,
                type: 'sendChangePasswordNotification'
            });
        } catch (err) {
            console.error(
                `sendChangePasswordNotification: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            } else {
                return false;
            }
        }
    }

    async sendChangePasswordByAdminNotification(
        manager: EntityManager,
        emailAddress: string,
        throwError = false
    ) {
        const tenant = await this.getTenant(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);

        const data = {
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            url: `${BASE_URL}/log-in`
        };
        try {
            return await send({
                templateId: SENDGRID_CHANGE_PASSWORD_BY_ADMIN_NOTIFICATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: emailAddress,
                type: 'sendChangePasswordByAdminNotification'
            });
        } catch (err) {
            console.error(
                `sendChangePasswordByAdminNotification: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            } else {
                return false;
            }
        }
    }

    async sendChangeProfileSettingsNotification(
        manager: EntityManager,
        emailAddress: string,
        throwError = false
    ) {
        const tenant = await this.getTenant(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);

        const data = {
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip
        };
        try {
            return await send({
                templateId: SENDGRID_CHANGE_SETTINGS_NOTIFICATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: emailAddress,
                type: 'sendChangeProfileSettingsNotification'
            });
        } catch (err) {
            console.error(
                `sendChangeProfileSettingsNotification: Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            } else {
                return false;
            }
        }
    }

    async sendAddedNewFundingSourceNotification(
        manager: EntityManager,
        emailAddress: string,
        institutionName: string,
        accountName: string,
        throwError = false
    ) {
        const tenant = await this.getTenant(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);

        const data = {
            url: `${BASE_URL}/funds/contribution-history`,
            institutionName,
            accountName,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip
        };
        try {
            await send({
                templateId: SENDGRID_NEW_FUNDING_SOURCE_NOTIFICATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: emailAddress,
                type: 'sendAddedNewFundingSourceNotification'
            });
        } catch (err) {
            console.error(
                `sendAddedNewFundingSourceNotification: Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendNewFundOpenNotification(
        manager: EntityManager,
        emailAddress: string,
        fundName: string,
        throwError = false
    ) {
        const tenant = await this.getTenant(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);

        const data = {
            url: `${BASE_URL}/log-in`,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            fundName
        };
        try {
            await send({
                templateId: SENDGRID_NEW_FUND_OPENED_NOTIFICATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: emailAddress,
                type: 'sendNewFundOpenNotification'
            });
        } catch (err) {
            console.error(
                `sendNewFundOpenNotification: Payload - ${JSON.stringify(data)} - Error - ${
                    err.message
                }`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendContributionPostedToFundHoldersNotification(
        manager: EntityManager,
        emailAddress: string,
        fundName: string,
        fundTransactionId: string,
        donorFullName: string,
        throwError = false
    ) {
        const tenant = await this.getTenant(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);

        const data = {
            url: `${BASE_URL}/funds/contribution-history?contributionId=${fundTransactionId}`,
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            fundName,
            donorFullName
        };

        return await send({
            templateId: SENDGRID_CONTRIBUTION_POSTED_FUNDHOLDER_NOTIFICATION,
            from: tenantFromEmail,
            dynamicTemplateData: data,
            to: emailAddress,
            type: 'sendContributionPostedToFundHoldersNotification'
        }).catch(err => {
            console.error(
                `sendContributionPostedToFundHoldersNotification: Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        });
    }

    async sendContributionPostedToDonorNotification(
        manager: EntityManager,
        emailAddress: string,
        fundName: string,
        donorFullName: string,
        contribution: FundTransaction,
        throwError = false
    ) {
        const tenant = await this.getTenant(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        const bccEmail = await this.getTenantEmail(manager, 'bccEmail');
        const { paymentType } = contribution.metadata.paymentDetails;

        const data = {
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            fundName,
            donorFullName,
            amount: Math.abs(contribution.amount).toFixed(SIGNIFICANT_DIGITS),
            createdOn: dayjs(contribution.createdOn).format('MM/DD/YYYY'),
            paymentType
        };

        try {
            await send({
                templateId: SENDGRID_CONTRIBUTION_POSTED_DONOR_NOTIFICATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: emailAddress,
                bcc: bccEmail,
                type: 'sendContributionPostedToFundHoldersNotification'
            });
        } catch (err) {
            console.error(
                `sendContributionPostedToDonorNotification: Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        }
    }

    async sendConfirmationStockGiftReceivedNotification(
        manager: EntityManager,
        emailAddress: string,
        fundName: string,
        donorFullName: string,
        contribution: FundTransaction,
        throwError = false
    ) {
        const tenant = await this.getTenant(manager);
        const tenantFromEmail = await this.getTenantFromEmailAddress(manager);
        const { units, tickerSymbol } = contribution.metadata.paymentDetails;

        // EMAIL TESTING START
        // const emailTranslated = emailAddress
        //     .replace(/\./g, 'DOT')
        //     .replace(/@/, 'AT')
        //     .replace(/\+/g, 'PLUS');
        // const TESTemailAddr = `first.lastname+${emailTranslated}@kinandcarta.com`;
        // EMAIL TESTING END

        const data = {
            tenant: tenant.name,
            tenantPhone: tenant.phone,
            tenantUrl: tenant.url,
            tenantAddressLineOne: tenant.addressLineOne,
            tenantAddressCityStateZip: tenant.cityStateZip,
            fundName,
            donorFullName,
            amount: Math.abs(contribution.amount).toFixed(SIGNIFICANT_DIGITS),
            createdOn: dayjs(contribution.createdOn).format('MM/DD/YYYY'),
            units,
            tickerSymbol
        };

        try {
            await send({
                templateId: SENDGRID_CONTRIBUTION_STOCK_GIFT_RECEIVED_NOTIFICATION,
                from: tenantFromEmail,
                dynamicTemplateData: data,
                to: emailAddress, // for testing: TESTemailAddr (remember to change first.lastname)
                type: 'sendConfirmationStockGiftReceivedNotification'
            });
        } catch (err) {
            console.error(
                `sendConfirmationStockGiftReceivedNotification: Payload - ${JSON.stringify(
                    data
                )} - Error - ${err.message}`
            );
            if (throwError) {
                throw err;
            }
        }
    }
}
