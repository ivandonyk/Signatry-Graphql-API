import { NotificationType } from './../models/Notification';
import { getOrCreateConnection } from '../typeorm';
import { Fund, UserProfile, FundTransactionDetail } from '../models';
import { FundPermissionAccessType, FundPermissionAccessLevel } from '../models/FundPermission';
import { EmailService } from '../sendgrid';
import { pdfGenerator } from '../pdfs/pdfGenerator';
import {
    pdfTemplateContributionsHeader,
    pdfTemplateContributionsGreeting,
    pdfTemplateContributionsTable,
    pdfTemplateContributionsFooter
} from '../pdfs/pdfTemplateContributions';
import dayjs from 'dayjs';
import { shouldSendNotification } from '../utilities/email';

const emailService = new EmailService();

const getFundsAndDonors = async (fundTransactionDetails: FundTransactionDetail[]) => {
    const connection = await getOrCreateConnection();
    const fundRepo = connection.getRepository(Fund);
    const userProfileRepo = connection.getRepository(UserProfile);

    const fundIdsSet = new Set<string>();
    const donorIdsSet = new Set<string>();

    // pull out id's for the db queries
    fundTransactionDetails.forEach(ftd => {
        fundIdsSet.add(ftd.fundTransaction.fundId);
        donorIdsSet.add(ftd.fundTransaction.userProfileId);
    });

    const [funds, donors] = await Promise.all([
        // fund
        fundRepo
            .createQueryBuilder('fund')
            .leftJoinAndSelect('fund.fundUserProfiles', 'fundUserProfiles')
            .leftJoinAndSelect('fundUserProfiles.fundRole', 'fundUserRole')
            .leftJoinAndSelect('fundUserRole.fundPermissions', 'fundPermissions')
            .leftJoinAndSelect('fundUserProfiles.userProfile', 'userProfile')
            .leftJoinAndSelect('userProfile.primaryEmail', 'primaryEmail')
            .where('fund.id in (:...fundIds)', { fundIds: Array.from(fundIdsSet) })
            .andWhere('fundPermissions.access_level != :level', {
                level: FundPermissionAccessLevel.NONE
            })
            .andWhere('fundPermissions.accessType = :accessType', {
                accessType: FundPermissionAccessType.FUND_DETAILS
            })
            .select([
                'fund.id',
                'fund.name',
                'fund.fundCode',
                'fundUserProfiles.id',
                'userProfile.id',
                'primaryEmail.id',
                'primaryEmail.value'
            ])
            .getMany(),

        // donors
        userProfileRepo
            .createQueryBuilder('userProfile')
            .leftJoinAndSelect('userProfile.primaryEmail', 'primaryEmail')
            .leftJoinAndSelect('userProfile.appUser', 'appUser')
            .leftJoinAndSelect('userProfile.primaryAddress', 'primaryAddress')
            .where('userProfile.id in (:...donorIds)', { donorIds: Array.from(donorIdsSet) })
            .andWhere('primaryEmail.isPrimary = true')
            .select([
                'userProfile.id',
                'userProfile.firstName',
                'userProfile.middleName',
                'userProfile.lastName',
                'appUser.username',
                'primaryEmail.id',
                'primaryEmail.value',
                'primaryAddress.lineOne',
                'primaryAddress.lineTwo',
                'primaryAddress.lineThree',
                'primaryAddress.city',
                'primaryAddress.state',
                'primaryAddress.postalCode'
            ])
            .getMany()
    ]).catch(err => {
        throw err;
    });

    const fundsMap = funds.reduce((accum: { [key: string]: Fund }, fund: Fund) => {
        accum[fund.id] = fund;
        return accum;
    }, {});

    const donorsMap = donors.reduce((accum: { [key: string]: UserProfile }, donor: UserProfile) => {
        accum[donor.id] = donor;
        return accum;
    }, {});

    return { fundsMap, donorsMap };
};

export const sendContributionPostedEmails = async (
    fundTransactionDetails: FundTransactionDetail[]
) => {
    const connection = await getOrCreateConnection();
    const { fundsMap, donorsMap } = await getFundsAndDonors(fundTransactionDetails);

    // lets go send both sets of emails
    const emailPromises = [];
    const uniqueDonors = [];
    fundTransactionDetails.forEach(fundTransactionDetail => {
        const { fundTransaction } = fundTransactionDetail;
        const donor = donorsMap[fundTransaction.userProfileId];

        // TS-1665: commented out for now as it will probably come back
        // send confirmation emails to fund holders
        const fund = fundsMap[fundTransaction.fundId];
        fund.fundUserProfiles.map(async fundUserProfile => {
            const fundHolderEmailAddress = fundUserProfile.userProfile.primaryEmail[0].value;
            const sendNotification = await shouldSendNotification(
                connection.manager,
                fundUserProfile.userProfile.id,
                NotificationType.CONTRIBUTION_POSTED,
                fund.id
            );
            if (sendNotification) {
                emailPromises.push(
                    emailService.sendContributionPostedToFundHoldersNotification(
                        connection.manager,
                        fundHolderEmailAddress,
                        fund.name,
                        fundTransaction.id,
                        donor.fullName
                    )
                );
            }
        });

        // TS-1665: commented out for now as it will probably come back
        // send confirmation to donor
        // const donorEmailAddress = donor.primaryEmail[0].value;
        // emailPromises.push(
        //     emailService.sendContributionPostedToDonorNotification(
        //         connection.manager,
        //         donorEmailAddress,
        //         fund.name,
        //         donor.fullName,
        //         fundTransaction
        //     )
        // );

        // make sure these objects exist before adding to them
        if (!uniqueDonors[donor.id]) {
            uniqueDonors[donor.id] = {};
        }

        if (!uniqueDonors[donor.id][fund.id]) {
            uniqueDonors[donor.id][fund.id] = [];
        }

        // add this transaction to the list of unique donors/funds
        uniqueDonors[donor.id][fund.id].push(fundTransaction);
    });

    // loop through unique donors -> funds -> fundTransactions
    for (const donorId in uniqueDonors) {
        for (const fundId in uniqueDonors[donorId]) {
            const donor = donorsMap[donorId];
            const fund = fundsMap[fundId];

            // generate pdf
            let html = '';
            const fundTransaction2 = uniqueDonors[donorId][fundId][0]; // this is just a reference to the very first fundTransaction, which we'll use as the fundTransaction for this entire pdf
            const contributionsTableData = [];

            // loop through all transactions for this fund
            for (const fundTransaction of uniqueDonors[donorId][fundId]) {
                contributionsTableData.push({
                    date: fundTransaction.chargedOn,
                    asset: 'Cash',
                    value: fundTransaction.amount
                });
            }

            const createdBy = donorsMap[fundTransaction2.userProfileId]; // find by userProfileId
            const pdfFilePath = 'funds/' + fund.fundCode;
            const pdfFilename =
                'ContributionReceipt_' +
                dayjs(fundTransaction2.chargedOn).format('MM-DD-YYYY') +
                '_' +
                donor.firstName +
                donor.lastName +
                '_' +
                donor.appUser.username +
                '_' +
                fund.fundCode +
                '.pdf';

            html += pdfTemplateContributionsHeader({
                name: donor.fullName,
                lineOne: donor.primaryAddress[0].lineOne,
                lineTwo: donor.primaryAddress[0].lineTwo,
                lineThree: donor.primaryAddress[0].lineThree,
                city: donor.primaryAddress[0].city,
                state: donor.primaryAddress[0].state,
                postalCode: donor.primaryAddress[0].postalCode
            });
            html += pdfTemplateContributionsGreeting(
                fundTransaction2.createdOn,
                fund.name,
                createdBy.fullName,
                fund.fundCode
            );
            html += pdfTemplateContributionsTable(contributionsTableData);
            html += pdfTemplateContributionsFooter();

            pdfGenerator(pdfFilePath, pdfFilename, html);
        }
    }

    // send the promise back to caller
    return Promise.all(emailPromises);
};

export const sendConfirmationStockGiftReceivedEmails = async (
    fundTransactionDetails: FundTransactionDetail[]
) => {
    const connection = await getOrCreateConnection();
    const { fundsMap, donorsMap } = await getFundsAndDonors(fundTransactionDetails);

    // lets go send both sets of emails
    const emailPromises = [];
    const uniqueDonors = [];

    fundTransactionDetails.forEach(async fundTransactionDetail => {
        const { fundTransaction } = fundTransactionDetail;
        const donor = donorsMap[fundTransaction.userProfileId];

        // send confirmation emails to fund holders
        const fund = fundsMap[fundTransaction.fundId];
        fund.fundUserProfiles.map(async fundUserProfile => {
            const fundHolderEmailAddress = fundUserProfile.userProfile.primaryEmail[0].value;
            const sendNotification = await shouldSendNotification(
                connection.manager,
                fundUserProfile.userProfile.id,
                NotificationType.CONTRIBUTION_STOCK_GIFT_RECEIVED,
                fund.id
            );
            if (sendNotification) {
                emailPromises.push(
                    emailService.sendConfirmationStockGiftReceivedNotification(
                        connection.manager,
                        fundHolderEmailAddress,
                        fund.name,
                        donor.fullName,
                        fundTransaction
                    )
                );
            }
        });

        const sendNotification = await shouldSendNotification(
            connection.manager,
            donor.id,
            NotificationType.CONTRIBUTION_STOCK_GIFT_RECEIVED,
            fund.id
        );
        if (sendNotification) {
            // send confirmation to donor
            const donorEmailAddress = donor.primaryEmail[0].value;
            emailPromises.push(
                emailService.sendConfirmationStockGiftReceivedNotification(
                    connection.manager,
                    donorEmailAddress,
                    fund.name,
                    donor.fullName,
                    fundTransaction
                )
            );
        }

        // make sure these objects exist before adding to them
        if (!uniqueDonors[donor.id]) {
            uniqueDonors[donor.id] = {};
        }

        if (!uniqueDonors[donor.id][fund.id]) {
            uniqueDonors[donor.id][fund.id] = [];
        }

        // add this transaction to the list of unique donors/funds
        uniqueDonors[donor.id][fund.id].push(fundTransaction);
    });

    // loop through unique donors -> funds -> fundTransactions
    for (const donorId in uniqueDonors) {
        for (const fundId in uniqueDonors[donorId]) {
            const donor = donorsMap[donorId];
            const fund = fundsMap[fundId];

            // generate pdf
            let html = '';
            const fundTransaction2 = uniqueDonors[donorId][fundId][0]; // this is just a reference to the very first fundTransaction, which we'll use as the fundTransaction for this entire pdf
            const grantsTableData = [];

            // loop through all transactions for this fund
            for (const fundTransaction of uniqueDonors[donorId][fundId]) {
                grantsTableData.push({
                    date: fundTransaction.chargedOn,
                    asset:
                        fundTransaction.metadata.paymentDetails.units +
                        ' shares of ' +
                        fundTransaction.metadata.paymentDetails.securityName, // todo: fix 'shares' plural
                    value:
                        parseInt(fundTransaction.metadata.paymentDetails.units) *
                        parseInt(fundTransaction.metadata.paymentDetails.value)
                });
            }

            const createdBy = donorsMap[fundTransaction2.userProfileId]; // find by userProfileId
            const pdfFilePath = 'funds/' + fund.fundCode;
            const pdfFilename =
                'StockContributionReceipt_' +
                dayjs(fundTransaction2.chargedOn).format('MM-DD-YYYY') +
                '_' +
                donor.firstName +
                donor.lastName +
                '_' +
                donor.appUser.username +
                '_' +
                fund.fundCode +
                '.pdf';

            html += pdfTemplateContributionsHeader({
                name: donor.fullName,
                lineOne: donor.primaryAddress[0].lineOne,
                lineTwo: donor.primaryAddress[0].lineTwo,
                lineThree: donor.primaryAddress[0].lineThree,
                city: donor.primaryAddress[0].city,
                state: donor.primaryAddress[0].state,
                postalCode: donor.primaryAddress[0].postalCode
            });

            html += pdfTemplateContributionsGreeting(
                fundTransaction2.createdOn,
                fund.name,
                createdBy.fullName,
                fund.fundCode
            );
            html += pdfTemplateContributionsTable(grantsTableData);
            html += pdfTemplateContributionsFooter();

            pdfGenerator(pdfFilePath, pdfFilename, html);
        }
    }

    // send the promise back to caller
    return Promise.all(emailPromises);
};
