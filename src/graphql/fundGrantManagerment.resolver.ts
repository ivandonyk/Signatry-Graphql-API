import { Arg, Resolver, Ctx, Mutation } from 'type-graphql';
import { BaseResolver } from './core/BaseResolver';
import { GraphQLContext } from '../context';
import { GrantCancelInput } from '../inputs/FundTransaction/GrantCancelInput';
import { FundPermissionAccessType, FundPermissionAccessLevel } from '../models/FundPermission';
import { GrantUpdateResponse } from '../models/GrantUpdateResponse';
import { FundTransaction } from '../models/FundTransaction';
import { UserProfile } from '../models/UserProfile';
import { AppUser } from '../models/AppUser';
import { TransactionStatus, TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { FundTransactionDetail } from '../models/FundTransactionDetail';
import { TransactionEvent, EventNameValue } from '../models/TransactionEvent';
import { GrantOperations } from '../inputs/FundTransaction/GrantUpdateInput';

import {
    TransactionDetailStatus,
    TransactionDetailStatusValue
} from '../models/TransactionDetailStatus';
import { FundPermissionLock } from '../decorators/fundPermissionDecorator';
import { ConflictError } from '../errors/Conflict';
import { formatStatus } from '../utilities/getTransactionStatuses';
@Resolver()
export class FundGrantManagementResolver extends BaseResolver {
    @FundPermissionLock(FundPermissionAccessType.GRANT_CANCEL, FundPermissionAccessLevel.FULL)
    @Mutation(type => GrantUpdateResponse)
    public async cancelGrantNonAdmin(
        @Ctx() context: GraphQLContext,
        @Arg('grantInput') { fundId, grantId, ...vars }: GrantCancelInput
    ): Promise<GrantUpdateResponse> {
        const manager = context.typeorm.manager;
        const transStatusRepo = manager.getRepository(TransactionStatus);
        const transDetailStatusRepo = manager.getRepository(TransactionDetailStatus);
        const grantRepo = manager.getRepository(FundTransaction);
        const userProfileRepo = manager.getRepository(UserProfile);

        // get all the data we need in one go async
        const [
            expectedCurrentStatus,
            newStatus,
            transDetailCanceledStatus,
            grant,
            userProfile
        ] = await Promise.all([
            transStatusRepo.findOne(
                {
                    name: vars.expectedCurrentStatusValue
                },
                { select: ['id', 'name'] }
            ),
            transStatusRepo.findOne({ name: vars.newStatusValue }, { select: ['id', 'name'] }),
            transDetailStatusRepo.findOne(
                {
                    name: TransactionDetailStatusValue.CANCELED
                },
                { select: ['id', 'name'] }
            ),
            grantRepo.findOne(
                { id: grantId },
                {
                    relations: ['transactionDetails', 'transactionDetails.transactionDetailType']
                }
            ),
            context.typeorm
                .createQueryBuilder(UserProfile, 'userProfile')
                .select(['userProfile.id', 'userProfile.firstName', 'userProfile.lastName'])
                .innerJoin(
                    AppUser,
                    'appUser',
                    'appUser.id = userProfile.app_user_id and appUser.sub = :subId',
                    {
                        subId: context.user.sub
                    }
                )
                .getOne()
        ]);

        // only interested in a change to CANCEL.
        if (newStatus.name !== TransactionStatusValue.CANCELED) {
            throw new Error(
                `Only interested in changing status to CANCELED, was supplied: ${newStatus.name}`
            );
        }

        // Ensure that the current status the requesting user is expecting accurately reflects the database
        if (grant.transactionStatusId !== expectedCurrentStatus.id) {
            throw new ConflictError(
                `Grant ${grant.transactionCode} could not be updated with status ${formatStatus(
                    vars.newStatusValue
                )} because a newer version of it exists`
            );
        }

        const paymentCashDetail = grant.transactionDetails.find(detail => {
            return detail.transactionDetailType.name === TransactionDetailTypeName.CASH_OUT;
        });

        // Update the grant record with the new status
        grant.transactionStatusId = newStatus.id;
        grant.onHold = false;

        const canceledTransactionEvent = manager.create(TransactionEvent, {
            createdBy: userProfile.id,
            updatedBy: userProfile.id,
            userProfileId: userProfile.id,
            fundTransactionId: grant.id,
            name: EventNameValue.CANCELED
        });

        await Promise.all([
            manager.update(FundTransactionDetail, paymentCashDetail.id, {
                transactionDetailStatusId: transDetailCanceledStatus.id
            }),
            manager.save(grant),
            manager.save(canceledTransactionEvent)
        ]);

        return {
            operation: GrantOperations.UPDATE_STATUS,
            grantIds: [grantId],
            expectedCurrentStatusValue: vars.newStatusValue,
            newStatusValue: vars.expectedCurrentStatusValue
        };
    }
}
