import { getOrCreateConnection } from '../../typeorm';
import {
    Fund,
    UserProfile,
    UserProfileEmail,
    UserProfileAddress,
    UserProfilePhone,
    UserProfileRole,
    Role,
    WebhookEvent
} from '../../models';
import { createExternalContribution } from '../../utilities/createContribution';
import { AccountingFacade } from '../../accounting';
import { addUserToFund } from '../../utilities/addUserToFund';
import { RoleTypeValues } from '../../models/Role';

export async function handleTransactionCreated(event: WebhookEvent) {
    const connection = await getOrCreateConnection();
    const userProfileRepo = connection.getRepository(UserProfile);

    async function createUserRecords(contact, address): Promise<UserProfile> {
        const userProfile = await connection.manager.transaction(async manager => {
            const { email, firstname, lastname, phone } = contact;
            const customerId = await new AccountingFacade().createCustomer(
                firstname,
                lastname,
                email
            );
            const donorRole = await manager
                .getRepository(Role)
                .findOne({ name: RoleTypeValues.DONOR });
            const userProfileRepo = manager.getRepository(UserProfile);
            const userProfile = await userProfileRepo.save(
                userProfileRepo.create({
                    firstName: firstname,
                    lastName: lastname,
                    accountingCustomerId: customerId,
                    role: donorRole
                })
            );
            await manager.getRepository(UserProfileRole).save({
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                userProfileId: userProfile.id,
                roleId: donorRole.id
            });
            const userProfileEmailRepo = manager.getRepository(UserProfileEmail);
            await userProfileEmailRepo.save({
                value: email,
                userProfileId: userProfile.id,
                isPrimary: true
            });
            if (address) {
                const userProfileAddressRepo = manager.getRepository(UserProfileAddress);
                const { city, country, state, street, street2, zip } = contact.address;
                await userProfileAddressRepo.save(
                    userProfileAddressRepo.create({
                        lineOne: street,
                        lineTwo: street2 || null,
                        city: city,
                        state: state,
                        country: country,
                        postalCode: zip,
                        userProfileId: userProfile.id,
                        isPrimary: true
                    })
                );
            }
            if (phone) {
                const userProfilePhoneRepo = manager.getRepository(UserProfilePhone);
                await userProfilePhoneRepo.save(
                    userProfilePhoneRepo.create({
                        value: phone,
                        userProfileId: userProfile.id,
                        isPrimary: true
                    })
                );
            }
            return userProfile;
        });

        return userProfile;
    }

    async function getFundFromCampaignTitle(campaignTitle): Promise<Fund> {
        // altered to allow any number of digits, optional # after the paren, and extra characters at the end
        const regex = /^(.*)\(#?(\d+)\)/;
        const regexMatch = campaignTitle.match(regex);
        if (typeof regexMatch[2] == 'undefined') {
            return null;
        }
        const fundCode = regexMatch[2];
        return connection.getRepository(Fund).findOne({ fundCode: fundCode });
    }

    // Parse data from event
    const {
        net_proceeds: amount,
        donor_paid_fee: feeAmount, // Not used for iDonate contributions
        campaign_id: campaignId,
        campaign_title: campaignTitle,
        contact: contact,
        address: address,
        status: status,
        reference_code: referenceCode, // Not used for MVP, but needed later
        payment_transaction_id: paymentTransactionId,
        subtype: paymentType
    } = event.eventData;

    // Find fund based on campaign title
    const fund = await getFundFromCampaignTitle(campaignTitle);
    if (!fund) {
        // Throw error to fail promise
        throw new Error(
            `ERROR: Unable to find fund for iDonate transaction for campaignTitle: ${campaignTitle}`
        );
    }
    // Check if user exists
    const { email } = contact;
    let userProfile = await userProfileRepo
        .createQueryBuilder('userProfile')
        .leftJoin('app_user', 'appUser', 'userProfile.appUserId = appUser.id')
        .leftJoin('userProfile.emails', 'emails')
        .where('"appUser"."email_address" = :email', { email: email })
        .orWhere('emails.value = :value', { value: email })
        .getOne();
    // Create user profile if not
    if (!userProfile) {
        try {
            userProfile = await createUserRecords(contact, address);
        } catch (error) {
            console.log('ERROR: Unable to create new user record for iDonate transaction');
            console.log(error);
            // Throw error to fail promise
            throw new Error(
                `ERROR: Unable to create new user record for iDonate transaction: ${error}`
            );
        }
    }

    // Add user to fund if needed
    await addUserToFund(userProfile, fund, connection);

    // Create contribution
    await createExternalContribution(
        fund,
        userProfile,
        amount,
        0, //iDonate contributions has no fee
        paymentType,
        paymentTransactionId
    );

    // return event from promise so that it can be removed when it succeeds
    return event;
}
