import { getOrCreateConnection } from '../../typeorm';
import { Recipient, RecipientStatus, RecipientEvent } from '../../models';
import { RecipientEventNameValues } from '../../models/RecipientEvent';
import { RecipientStatusName } from '../../models/RecipientStatus';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/** Expires any existing recipients that have an APPROVED status,
 *  but whose approvalExpirationDate is today or has passed
 **/
export const updateExpiredRecipientApprovalStatuses = async () => {
    const connection = await getOrCreateConnection();
    const recipientRepo = connection.getRepository(Recipient);
    const recipientStatusRepo = connection.getRepository(RecipientStatus);

    const approvedStatus = await recipientStatusRepo.findOne({
        name: RecipientStatusName.APPROVED
    });
    const expiredStatus = await recipientStatusRepo.findOne({
        name: RecipientStatusName.EXPIRED
    });

    const currentlyApprovedRecipients = await recipientRepo.find({
        recipientStatusId: approvedStatus.id
    });

    // Set recipients whose approval dates have expired to the EXPIRED status, remove the approvalExpirationDate, since it's no longer relevant, and create an "EXPIRED" RecipientEvent
    return await Promise.all(
        currentlyApprovedRecipients.map(async recipient => {
            if (
                dayjs.utc(recipient.approvalExpirationDate).isBefore(dayjs().utc(), 'day') ||
                dayjs.utc(recipient.approvalExpirationDate).isSame(dayjs().utc(), 'day')
            ) {
                recipient.approvalExpirationDate = null;
                recipient.recipientStatus = expiredStatus;
                recipient.recipientStatusId = expiredStatus.id;

                await recipientRepo.save(recipient);

                const recipientEventRepo = connection.getRepository(RecipientEvent);

                const systemUserId = '00000000-0000-0000-0000-000000000000';

                return await recipientEventRepo
                    .save(
                        recipientEventRepo.create({
                            name: RecipientEventNameValues.EXPIRED,
                            recipientId: recipient.id,
                            createdBy: systemUserId,
                            updatedBy: systemUserId,
                            userProfileId: systemUserId
                        })
                    )
                    .catch(error => console.error(error));
            }
        })
    );
};
