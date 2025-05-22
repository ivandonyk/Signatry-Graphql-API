import { EntityManager } from 'typeorm';
import {
    FundTransaction,
    FundTransactionDetail,
    FundTransactionInfo,
    TransactionEvent,
    TransactionStatus
} from '../models';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { eventNameFromStatusName } from '../models/TransactionEvent';
import { RecipientStatusName } from '../models/RecipientStatus';
import { eventEmitter, EVENTS } from '../events';
import { isType, createCashTransactionDetails } from './transactionDetail';
import { SYSTEM_USER_ID } from '../models/UserProfile';

export const grantUtil = {
    async getNewStatus(manager: EntityManager, grant: FundTransaction): Promise<TransactionStatus> {
        const transactionInfo = await manager
            .getRepository(FundTransactionInfo)
            .createQueryBuilder('fundTransactionInfo')
            .innerJoinAndSelect('fundTransactionInfo.recipient', 'recipient')
            .innerJoinAndSelect('recipient.recipientStatus', 'recipientStatus')
            .where('fundTransactionInfo.fundTransactionId = :transactionId', {
                transactionId: grant.id
            })
            .getOne();

        const { availableBalanceApproved, finalReview, specialApproval } = grant;
        const { purposeNotesApproved, specialInstructionsApproved } = transactionInfo;
        const { name: recipientStatusName } = transactionInfo.recipient.recipientStatus;
        const { name: transactionStatusName } = grant.transactionStatus;

        if (transactionStatusName === TransactionStatusValue.IN_DUE_DILIGENCE) {
            // If in due diligence and all conditions met, send to review
            if (
                availableBalanceApproved &&
                purposeNotesApproved !== false &&
                specialInstructionsApproved !== false &&
                recipientStatusName === RecipientStatusName.APPROVED
            ) {
                return await manager
                    .getRepository(TransactionStatus)
                    .findOne({ name: TransactionStatusValue.IN_REVIEW });
            }
        } else if (transactionStatusName === TransactionStatusValue.IN_REVIEW) {
            // If in review and some conditions not met, send back to due diligence
            if (
                !availableBalanceApproved ||
                purposeNotesApproved == false ||
                specialInstructionsApproved == false ||
                recipientStatusName === RecipientStatusName.DENIED
            ) {
                return await manager
                    .getRepository(TransactionStatus)
                    .findOne({ name: TransactionStatusValue.IN_DUE_DILIGENCE });
            } else if (finalReview && specialApproval !== false) {
                // If in review and final review and special approval are given, send to approved
                return await manager
                    .getRepository(TransactionStatus)
                    .findOne({ name: TransactionStatusValue.APPROVED });
            }
        }
        return grant.transactionStatus;
    },

    async saveGrant(
        manager: EntityManager,
        grant: FundTransaction,
        updatingProfile?: string
    ): Promise<FundTransaction> {
        if (!updatingProfile) {
            updatingProfile = SYSTEM_USER_ID;
        }
        const currentStatus = await manager
            .getRepository(TransactionStatus)
            .findOne({ id: grant.transactionStatusId });
        grant.transactionStatus = currentStatus;
        const newStatus = await this.getNewStatus(manager, grant);

        if (newStatus.name !== currentStatus.name) {
            const eventName = eventNameFromStatusName(newStatus.name);
            await manager.save(
                manager.create(TransactionEvent, {
                    fundTransactionId: grant.id,
                    name: eventName,
                    createdBy: updatingProfile,
                    updatedBy: updatingProfile,
                    userProfileId: updatingProfile
                })
            );
            grant.onHold = false;
            grant.transactionStatus = newStatus;
            if (newStatus.name === TransactionStatusValue.APPROVED) {
                const transactionDetails = await manager
                    .getRepository(FundTransactionDetail)
                    .createQueryBuilder('fundTransactionDetail')
                    .innerJoinAndSelect(
                        'fundTransactionDetail.transactionDetailType',
                        'transactionDetailType'
                    )
                    .where('fundTransactionDetail.fundTransactionId = :grantId', {
                        grantId: grant.id
                    })
                    .getMany();
                const divestments = transactionDetails.filter(
                    isType(TransactionDetailTypeName.DIVESTMENT)
                );
                if (!grant.bypassRequested && divestments.length === 0) {
                    const divestmentCash = transactionDetails.find(
                        isType(TransactionDetailTypeName.GRANT_DIVESTMENT_CASH)
                    );
                    // don't await
                    createCashTransactionDetails(manager, [divestmentCash.id]);
                }
            }
        }
        return await manager.save(grant);
    }
};
