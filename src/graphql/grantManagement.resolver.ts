import dayjs from 'dayjs';
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { In, EntityManager } from 'typeorm';

import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import { ConflictError } from '../errors/Conflict';
import { InsufficientFundsError } from '../errors/InsufficientFunds';
import { NotCoverDivestmentError } from '../errors/NotCoverDivestment';
import { eventEmitter, EVENTS } from '../events';
import { GrantOperations, GrantUpdateInput } from '../inputs/FundTransaction/GrantUpdateInput';
import {
    Fund,
    FundTransaction,
    FundTransactionComment,
    FundTransactionDetail,
    FundTransactionInfo,
    Recipient,
    RecipientStatus,
    Tenant,
    TransactionDetailType,
    TransactionPayment,
    TransactionRecurrence,
    UserProfile
} from '../models';
import { GLAccountTypeName } from '../models/GLAccountType';
import { GrantUpdateResponse } from '../models/GrantUpdateResponse';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { RecipientStatusName } from '../models/RecipientStatus';
import {
    TransactionDetailStatus,
    TransactionDetailStatusValue
} from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import {
    eventNameFromStatusName,
    EventNameValue,
    TransactionEvent
} from '../models/TransactionEvent';
import { TransactionStatus, TransactionStatusValue } from '../models/TransactionStatus';
import { FundRepository } from '../repositories/Fund';
import { GLAccountRepository } from '../repositories/GLAccount';
import { GrantManagementRepository } from '../repositories/GrantManagement';
import { bulkSave } from '../utilities/bulkSave';
import { fundsWithoutBalanceFromFundTransactions } from '../utilities/fees';
import { hasHoldingsToCoverDivestmentAllocations } from '../utilities/funds';
import { formatStatus } from '../utilities/getTransactionStatuses';
import { BatchResolver } from './batch.resolver';
import { BaseResolver } from './core/BaseResolver';
import { currency } from '../utilities/currency';
import { EmailType } from '../sendgrid';
import { JobType, addGraphileWorkerJob } from '../jobs';
import { isType, createProposedDetails } from '../utilities/transactionDetail';
import { grantUtil } from '../utilities/grant';
import { SYSTEM_USER_ID } from '../models/UserProfile';

type UpdateBooleanVars = Pick<GrantUpdateInput, 'expectedCurrentBooleanValue' | 'newBooleanValue'>;

@Resolver()
export class GrantManagementResolver extends BaseResolver {
    @PermissionLock(PermissionAccessType.ADMIN_GRANTS, PermissionAccessLevel.FULL)
    @Mutation(type => GrantUpdateResponse)
    public async updateGrant(
        @Ctx() context: GraphQLContext,
        @Arg('grantUpdateInput') { operation, grantIds, ...vars }: GrantUpdateInput
    ): Promise<GrantUpdateResponse> {
        // Determine the operation
        switch (operation) {
            case GrantOperations.UPDATE_STATUS:
                return this.updateStatus(context, grantIds, vars);
            case GrantOperations.UPDATE_GRANT_PAYMENT_STATUS:
                return this.updateGrantPaymentStatus(context, grantIds, vars);
            case GrantOperations.TOGGLE_ON_HOLD:
                return this.toggleOnHold(context, grantIds, vars);
            case GrantOperations.TOGGLE_FINAL_REVIEW_APPROVED:
                return this.toggleFinalReviewApproved(context, grantIds, vars);
            case GrantOperations.TOGGLE_SPECIAL_APPROVAL_GIVEN:
                return this.toggleSpecialApprovalGiven(context, grantIds, vars);
            case GrantOperations.TOGGLE_AVAILABLE_BALANCE_APPROVED:
                return this.toggleAvailableBalanceApproved(context, grantIds, vars);
            case GrantOperations.TOGGLE_PURPOSE_NOTES_APPROVED:
                return this.togglePurposeNotesApproved(context, grantIds, vars);
            case GrantOperations.TOGGLE_SPECIAL_INSTRUCTIONS_APPROVED:
                return this.toggleSpecialInstructionsApproved(context, grantIds, vars);
            case GrantOperations.UPDATE_CHARITY_STATUS:
                return this.updateRecipientStatus(context, grantIds, vars);
            case GrantOperations.TOGGLE_APPROVE_WITHOUT_DIVESTMENTS:
                return this.requestBypass(context, grantIds, vars);
            default:
                throw new Error(`Operation ${operation} not configured`);
        }
    }

    protected isValidUpdateStatusInput(
        vars: any
    ): vars is Pick<GrantUpdateInput, 'expectedCurrentStatusValue' | 'newStatusValue'> {
        // Ensure the two values are present and are valid members of the TransactionStatusValue enum
        if (
            vars.expectedCurrentStatusValue &&
            vars.newStatusValue &&
            [vars.expectedCurrentStatusValue, vars.newStatusValue].every(value =>
                Object.values(TransactionStatusValue).includes(value)
            )
        )
            return true;
        return false;
    }

    protected isValidUpdateGrantPaymentStatusInput(
        vars: any
    ): vars is Pick<
        GrantUpdateInput,
        'expectedCurrentGrantPaymentStatusValue' | 'newGrantPaymentStatusValue'
    > {
        // Ensure the two values are present and are valid members of the TransactionStatusValue enum
        if (
            vars.expectedCurrentGrantPaymentStatusValue &&
            vars.newGrantPaymentStatusValue &&
            [
                vars.expectedCurrentGrantPaymentStatusValue,
                vars.newGrantPaymentStatusValue
            ].every(value => Object.values(TransactionDetailStatusValue).includes(value))
        )
            return true;
        return false;
    }

    protected isValidUpdateRecipientStatusInput(
        vars: any
    ): vars is Pick<
        GrantUpdateInput,
        'expectedCurrentRecipientStatusValue' | 'newRecipientStatusValue'
    > {
        // Ensure the two values are present and are valid members of the TransactionStatusValue enum
        if (
            vars.expectedCurrentRecipientStatusValue &&
            vars.newRecipientStatusValue &&
            [vars.expectedCurrentRecipientStatusValue, vars.newRecipientStatusValue].every(value =>
                Object.values(RecipientStatusName).includes(value)
            )
        )
            return true;
        return false;
    }

    protected isValidUpdateBooleanInput(vars: any): vars is UpdateBooleanVars {
        if (
            typeof vars.expectedCurrentBooleanValue === 'boolean' &&
            typeof vars.newBooleanValue === 'boolean'
        )
            return true;
        return false;
    }

    protected async toggleOnHold(
        context: GraphQLContext,
        grantIds: string[],
        vars: UpdateBooleanVars
    ): Promise<GrantUpdateResponse> {
        // Ensure fields that are exposed as nullable via the API actually are present
        if (!this.isValidUpdateBooleanInput(vars))
            this.throwInvalidBooleanInputsError(GrantOperations.TOGGLE_ON_HOLD);

        const manager = context.typeorm.manager;
        const profile = await this.getCurrentUserProfile(context);

        await manager.transaction(async m => {
            for (const grantId of grantIds) {
                const grant = await m.findOne(FundTransaction, { id: grantId });
                const lastMajorEvent = await m.findOne(
                    TransactionEvent,
                    {
                        parentEventId: null,
                        fundTransactionId: grant.id
                    },
                    {
                        order: {
                            createdOn: 'DESC'
                        }
                    }
                );

                // Ensure that the current value of the onHold flag the requesting user is expecting on the associated FundTransaction accurately reflects the database
                if (grant.onHold !== vars.expectedCurrentBooleanValue) {
                    throw new ConflictError(
                        'Unable to complete action, because a newer version of the record exists.'
                    );
                }

                grant.onHold = vars.newBooleanValue;

                const eventName =
                    vars.newBooleanValue === true
                        ? EventNameValue.ON_HOLD
                        : EventNameValue.OFF_HOLD;

                await m.save(
                    m.create(TransactionEvent, {
                        createdBy: profile.id,
                        updatedBy: profile.id,
                        userProfileId: profile.id,
                        fundTransactionId: grant.id,
                        name: eventName,
                        parentEventId: lastMajorEvent.id
                    })
                );
                await grantUtil.saveGrant(m, grant, profile.id);
            }
        });

        return {
            operation: GrantOperations.TOGGLE_ON_HOLD,
            grantIds,
            expectedCurrentBooleanValue: vars.newBooleanValue,
            newBooleanValue: vars.expectedCurrentBooleanValue
        };
    }

    protected async updateGrantPaymentStatus(
        context: GraphQLContext,
        grantIds: string[],
        vars: Pick<
            GrantUpdateInput,
            'expectedCurrentGrantPaymentStatusValue' | 'newGrantPaymentStatusValue'
        >
    ): Promise<GrantUpdateResponse> {
        console.log('updateGrantPaymentStatus: Start');
        // Ensure fields that are exposed as nullable via the API actually are present
        if (!this.isValidUpdateGrantPaymentStatusInput(vars))
            throw new Error(`
                Invalid input for GrantOperations.UPDATE_GRANT_PAYMENT_STATUS:
                updating the status requires an expectedCurrentGrantPaymentStatusValue and a newGrantPaymentStatusValue
                of type GrantPaymentStatusValue
            `);

        const glAccountRepo = context.typeorm.manager.getCustomRepository(GLAccountRepository);
        const grantManagementRepo = context.typeorm.manager.getCustomRepository(
            GrantManagementRepository
        );
        const manager = context.typeorm.manager;

        // fetch relevant profile and tenant info
        const [
            profile,
            tenant,
            grantDispersementGLAccount,
            cashOutType,
            divestmentCashType
        ] = await Promise.all([
            this.getCurrentUserProfile(context),
            context.typeorm.getRepository(Tenant).findOne(),
            glAccountRepo.getByType(GLAccountTypeName.GRANT_DISBURSEMENT),
            manager
                .getRepository(TransactionDetailType)
                .findOne({ name: TransactionDetailTypeName.CASH_OUT }),
            manager
                .getRepository(TransactionDetailType)
                .findOne({ name: TransactionDetailTypeName.GRANT_DIVESTMENT_CASH })
        ]);

        // fetch status and detail status values
        let newStatusName: TransactionStatusValue;
        let newDetailStatusName: TransactionDetailStatusValue;

        if (
            vars.newGrantPaymentStatusValue === TransactionDetailStatusValue.PENDING_RECONCILIATION
        ) {
            // Making the payment
            newStatusName =
                process.env.RECONCILIATION_ENABLED === 'true'
                    ? TransactionStatusValue.PAID
                    : TransactionStatusValue.COMPLETE;
            newDetailStatusName =
                process.env.RECONCILIATION_ENABLED === 'true'
                    ? TransactionDetailStatusValue.PENDING_RECONCILIATION
                    : TransactionDetailStatusValue.COMPLETE;
        } else if (vars.newGrantPaymentStatusValue === TransactionDetailStatusValue.PENDING) {
            // Undoing the payment
            newStatusName = TransactionStatusValue.APPROVED;
            newDetailStatusName = vars.newGrantPaymentStatusValue;
        }

        const [newStatus, newDetailStatus] = await Promise.all([
            manager.findOne(TransactionStatus, { name: newStatusName }),
            manager.findOne(TransactionDetailStatus, { name: newDetailStatusName })
        ]);

        const grants = await manager
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
            .whereInIds(grantIds)
            .getMany();

        console.log(
            `updateGrantPaymentStatus: Loaded grant records. ${grants
                .map(g => g.transactionCode)
                .join(',')}`
        );

        let achCount = 0;
        let totalACHAmount = 0;
        let checkCount = 0;
        let totalCheckAmount = 0;
        let wireCount = 0;
        let totalWireAmount = 0;
        const types = {
            check: false,
            ach: false,
            wire: false
        };
        console.log('updateGrantPaymentStatus: Aggregating grant amounts by type');
        for (const grant of grants) {
            const paymentType =
                grant.metadata?.paymentDetails?.paymentType ||
                grant.transactionInfo.recipient.paymentType;

            switch (paymentType.toUpperCase()) {
                case 'ACH':
                    achCount++;
                    totalACHAmount = currency.add(grant.amount, totalACHAmount);
                    types.ach = true;
                    break;

                case 'WIRE':
                    wireCount++;
                    totalWireAmount = currency.add(grant.amount, totalWireAmount);
                    types.wire = true;
                    break;

                case 'CHECK':
                default:
                    checkCount++;
                    totalCheckAmount = currency.add(grant.amount, totalCheckAmount);
                    types.check = true;
                    break;
            }
        }

        const todaysDate = dayjs().format('MM/DD/YYYY');
        const date = dayjs().format('MM/DD/YYYY');
        const timeStamp = dayjs().format('HH:mm:ss');

        console.log('updateGrantPaymentStatus: DB transaction start');
        await manager.transaction(async m => {
            // generate payments
            let wirePayment = null;
            let checkPayment = null;
            let achPayment = null;
            if (types.wire) {
                console.log('updateGrantPaymentStatus: Creating WIRE TransactionPayment');
                wirePayment = await m.save(
                    m.create(TransactionPayment, {
                        type: 'Wire',
                        fileName: `WIRES_${date}_${timeStamp}`,
                        createdBy: profile.id,
                        updatedBy: profile.id,
                        date: todaysDate,
                        count: wireCount,
                        amount: Math.abs(totalWireAmount),
                        sourceAccount: grantDispersementGLAccount.title,
                        complete: false
                    })
                );
            }
            console.log('updateGrantPaymentStatus: Creating CHECK TransactionPayment');
            if (types.check) {
                checkPayment = await m.save(
                    m.create(TransactionPayment, {
                        type: 'Check',
                        fileName: `CHECKS_${date}_${timeStamp}`,
                        createdBy: profile.id,
                        updatedBy: profile.id,
                        date: todaysDate,
                        count: checkCount,
                        amount: Math.abs(totalCheckAmount),
                        sourceAccount: grantDispersementGLAccount.title,
                        complete: false
                    })
                );
            }
            console.log('updateGrantPaymentStatus: Creating ACH TransactionPayment');
            if (types.ach) {
                achPayment = await m.save(
                    m.create(TransactionPayment, {
                        type: 'ACH',
                        fileName: `NACHA_${date}_${timeStamp}`,
                        createdBy: profile.id,
                        updatedBy: profile.id,
                        date: todaysDate,
                        count: achCount,
                        amount: Math.abs(totalACHAmount),
                        sourceAccount: grantDispersementGLAccount.title,
                        complete: false
                    })
                );
            }

            const fileNumbQuery = await m.query("SELECT nextval('checkFileNumber')");
            const fileNumber = fileNumbQuery[0].nextval;
            const grantUpdates = {};

            console.log(
                'updateGrantPaymentStatus: Aggregating updates to grant FundTransaction records'
            );
            let currentCheckNumber = tenant.appSetting.checkNumber;
            for (const grant of grants) {
                const updates = {};
                const paymentType =
                    grant.metadata?.paymentDetails?.paymentType?.toUpperCase() ||
                    grant.transactionInfo.recipient.paymentType.toUpperCase();

                const transactionPayment = {
                    transactionPayment: {
                        fileNumber: paymentType === 'CHECK' ? fileNumber : null,
                        paymentFileId:
                            paymentType === 'CHECK' || !paymentType
                                ? checkPayment.id
                                : paymentType === 'WIRE'
                                ? wirePayment.id
                                : achPayment.id,
                        checkNumber:
                            paymentType === 'CHECK' || !paymentType ? currentCheckNumber : null,
                        date: todaysDate,
                        payee: grant.transactionInfo.recipient.name,
                        address: grant.transactionInfo.recipient.contact.primaryAddress.lineOne,
                        city: grant.transactionInfo.recipient.contact.primaryAddress.city,
                        state: grant.transactionInfo.recipient.contact.primaryAddress.state,
                        zip: grant.transactionInfo.recipient.contact.primaryAddress.postalCode,
                        amount: Math.abs(grant.amount),
                        grantDetails: grant.transactionInfo.purposeNotes || '',
                        memo: grant.transactionInfo.specialInstructions || '',
                        dedication: grant.transactionInfo.specialRecognition || ''
                    }
                };

                if (paymentType === 'CHECK' || !paymentType) {
                    updates['metadata'] = {
                        ...grant.metadata,
                        ...transactionPayment
                    };
                    updates['transactionPaymentId'] = checkPayment.id;

                    // TODO: Validate that this check number is real vs the book that the company actually uses.
                    // Ensure that the current status the requesting user is expecting accurately reflects the database
                    currentCheckNumber++;
                } else if (paymentType === 'WIRE') {
                    // TODO: ADD when Recipient Wire details are added to system:

                    updates['metadata'] = {
                        ...grant.metadata,
                        ...transactionPayment
                    };
                    updates['transactionPaymentId'] = wirePayment.id;
                } else if (paymentType === 'ACH') {
                    const achPaymentMetadata = await grantManagementRepo.generateACHMetadata(
                        m,
                        tenant,
                        grant,
                        grant.transactionInfo.recipient.id,
                        grantDispersementGLAccount
                    );

                    updates['metadata'] = {
                        ...grant.metadata,
                        achPayment: achPaymentMetadata
                    };
                    updates['transactionPaymentId'] = achPayment.id;
                }

                updates['onHold'] = false;
                updates['transactionStatusId'] = newStatus.id;

                if (
                    vars.newGrantPaymentStatusValue ===
                    TransactionDetailStatusValue.PENDING_RECONCILIATION
                ) {
                    updates['paidOn'] = new Date();
                } else if (
                    vars.expectedCurrentGrantPaymentStatusValue ===
                    TransactionDetailStatusValue.PENDING_RECONCILIATION
                ) {
                    updates['paidOn'] = null;
                }

                grantUpdates[grant.id] = updates;
            }
            console.log('updateGrantPaymentStatus: Updating check number on Tenant record');
            tenant.appSetting.checkNumber = currentCheckNumber;
            await m
                .getRepository(Tenant)
                .createQueryBuilder('tenant')
                .update()
                .set({ appSetting: tenant.appSetting })
                .where('id = :tenantId', { tenantId: tenant.id })
                .execute();

            console.log('updateGrantPaymentStatus: Updating grant FundTransaction records');
            for (const grantId in grantUpdates) {
                await m
                    .getRepository(FundTransaction)
                    .createQueryBuilder('fundTransaction')
                    .update()
                    .set(grantUpdates[grantId])
                    .where('id = :grantId', { grantId: grantId })
                    .execute();
            }

            console.log('updateGrantPaymentStatus: Updating grant FundTransactionDetail records');
            await m
                .getRepository(FundTransactionDetail)
                .createQueryBuilder('transactionDetail')
                .update()
                .set({
                    transactionDetailStatusId: newDetailStatus.id
                })
                .where('fundTransactionId IN (:...grantIds)', {
                    grantIds: Object.keys(grantUpdates)
                })
                .andWhere('transactionDetailTypeId IN (:...typeIds)', {
                    typeIds: [cashOutType.id, divestmentCashType.id]
                })
                .execute();

            const batchRes = new BatchResolver();
            if (
                vars.newGrantPaymentStatusValue ===
                TransactionDetailStatusValue.PENDING_RECONCILIATION
            ) {
                console.log('updateGrantPaymentStatus: Generating batches');
                await batchRes.generateGrantPaymentBatches(m, grantIds);
            }

            return grants;
        });
        console.log('updateGrantPaymentStatus: DB transaction end');

        console.log('updateGrantPaymentStatus: Queuing jobs to send emails and create PDFs');
        for (const grantId of grantIds) {
            await addGraphileWorkerJob(JobType.SEND_EMAIL, {
                emailType: EmailType.GRANT_PAID_DONOR,
                emailData: { grantId: grantId }
            });
            await addGraphileWorkerJob(JobType.SEND_EMAIL, {
                emailType: EmailType.GRANT_PAID_RECIPIENT,
                emailData: { grantId: grantId }
            });
            await addGraphileWorkerJob(JobType.SEND_EMAIL, {
                emailType: EmailType.GRANT_PAID_LAST_IN_SERIES,
                emailData: { grantId: grantId }
            });
            await addGraphileWorkerJob(JobType.GENERATE_GRANT_PDF, { grantId: grantId });
        }

        console.log('updateGrantPaymentStatus: Finished');
        return {
            operation: GrantOperations.UPDATE_GRANT_PAYMENT_STATUS,
            grantIds,
            expectedCurrentGrantPaymentStatusValue: newDetailStatusName,
            newGrantPaymentStatusValue: vars.expectedCurrentGrantPaymentStatusValue
        };
    }

    // Update status business logic
    protected async updateStatus(
        context: GraphQLContext,
        grantIds: string[],
        vars: Pick<GrantUpdateInput, 'expectedCurrentStatusValue' | 'newStatusValue'>
    ): Promise<GrantUpdateResponse> {
        // Ensure fields that are exposed as nullable via the API actually are present
        if (!this.isValidUpdateStatusInput(vars))
            throw new Error(`
                Invalid input for GrantOperations.UPDATE_STATUS:
                updating the status requires an expectedCurrentStatusValue and a newStatusValue
                of type TransactionStatusValues
            `);

        const profile = await this.getCurrentUserProfile(context);

        const manager = context.typeorm.manager;
        await manager.transaction(async m => {
            const grants = await m.getRepository(FundTransaction).find({
                where: { id: In(grantIds) },
                relations: [
                    'transactionDetails',
                    'transactionDetails.transactionDetailType',
                    'transactionDetails.transactionDetailStatus'
                ]
            });
            const statusRepo = manager.getRepository(TransactionStatus);
            const expectedCurrentStatus = await statusRepo.findOne({
                name: vars.expectedCurrentStatusValue
            });
            const newStatus = await statusRepo.findOne({ name: vars.newStatusValue });
            const detailStatusRepo = manager.getRepository(TransactionDetailStatus);

            if (grants.length === 1) {
                const transaction = grants[0];
                const fundTXDetails = await manager.getRepository(FundTransactionDetail).find({
                    fundTransactionId: grantIds[0]
                });

                const cashOutTransactionType = await manager.findOne(TransactionDetailType, {
                    name: TransactionDetailTypeName.CASH_OUT
                });
                const grantDivestmentCashType = await manager.findOne(TransactionDetailType, {
                    name: TransactionDetailTypeName.GRANT_DIVESTMENT_CASH
                });

                fundTXDetails.forEach(async (fundDetail: FundTransactionDetail) => {
                    const isDivestment =
                        fundDetail.transactionDetailTypeId === cashOutTransactionType.id;
                    const isCashOut =
                        fundDetail.transactionDetailTypeId === grantDivestmentCashType.id;
                    if (isDivestment || isCashOut) {
                        await manager.update(FundTransactionDetail, fundDetail.id, {
                            amount: transaction.amount
                        });
                    }
                });
            }

            for (const grant of grants) {
                // Ensure that the current status the requesting user is expecting accurately reflects the database
                // TODO: It's unclear as of 06/17 how to handle grants that don't meet this condition; fail the whole thing if one grant doesn't match the database state, for now
                if (grant.transactionStatusId !== expectedCurrentStatus.id) {
                    throw new ConflictError(
                        `Grant ${
                            grant.transactionCode
                        } could not be updated with status ${formatStatus(
                            vars.newStatusValue
                        )} because a newer version of it exists`
                    );
                }

                if (
                    newStatus.name === TransactionStatusValue.DENIED ||
                    newStatus.name === TransactionStatusValue.CANCELED
                ) {
                    const paymentCashDetail = grant.transactionDetails.find(
                        isType(TransactionDetailTypeName.CASH_OUT)
                    );
                    switch (newStatus.name) {
                        case TransactionStatusValue.DENIED:
                            const deniedStatus = await detailStatusRepo.findOne({
                                name: TransactionDetailStatusValue.DENIED
                            });
                            await manager.update(FundTransactionDetail, paymentCashDetail.id, {
                                transactionDetailStatusId: deniedStatus.id
                            });
                            break;
                        case TransactionStatusValue.CANCELED:
                            const canceledStatus = await detailStatusRepo.findOne({
                                name: TransactionDetailStatusValue.CANCELED
                            });
                            await manager.update(FundTransactionDetail, paymentCashDetail.id, {
                                transactionDetailStatusId: canceledStatus.id
                            });
                            break;
                    }
                }

                // Update the grant record with the new status
                grant.transactionStatusId = newStatus.id;
                grant.onHold = false;

                const eventName = eventNameFromStatusName(newStatus.name);

                if (eventName !== null) {
                    await m.save(
                        m.create(TransactionEvent, {
                            createdBy: profile.id,
                            updatedBy: profile.id,
                            userProfileId: profile.id,
                            fundTransactionId: grant.id,
                            name: eventName
                        })
                    );
                }
                await grantUtil.saveGrant(m, grant, profile.id);
            }
        });

        return {
            operation: GrantOperations.UPDATE_STATUS,
            grantIds,
            expectedCurrentStatusValue: vars.newStatusValue,
            newStatusValue: vars.expectedCurrentStatusValue
        };
    }
    protected throwInvalidBooleanInputsError(grantOperation: GrantOperations) {
        throw new Error(`
            Invalid input for GrantOperations.${grantOperation}:
            updating the status requires an expectedCurrentBooleanValue and a newBooleanValue
            of type boolean
        `);
    }

    // Update status business logic
    protected async updateRecipientStatus(
        context: GraphQLContext,
        grantIds: string[],
        vars: Pick<
            GrantUpdateInput,
            'expectedCurrentRecipientStatusValue' | 'newRecipientStatusValue'
        >
    ): Promise<GrantUpdateResponse> {
        // Ensure fields that are exposed as nullable via the API actually are present
        if (!this.isValidUpdateRecipientStatusInput(vars))
            throw new Error(`
                Invalid input for GrantOperations.UPDATE_CHARITY_STATUS:
                updating the status requires an expectedCurrentRecipientStatusValue and a newRecipientStatusValue
                of type RecipientStatusName
            `);

        const profile = await this.getCurrentUserProfile(context);

        const manager = context.typeorm.manager;

        await manager.transaction(async m => {
            const statusRepo = manager.getRepository(RecipientStatus);
            const expectedCurrentStatus = await statusRepo.findOne({
                name: vars.expectedCurrentRecipientStatusValue
            });
            const newStatus = await statusRepo.findOne({ name: vars.newRecipientStatusValue });
            // Keep recipients affected in memory so the below map doesn't have to fetch every time
            const recipients: { [key: string]: Recipient } = {}; // e.g. { grantId: Recipient, otherGrantId: Recipient }
            for (const grantId of grantIds) {
                if (!recipients[grantId]) {
                    const recipient = await context.typeorm
                        .createQueryBuilder(Recipient, 'recipient')
                        .leftJoinAndSelect('recipient.fundDestinations', 'fundTransactionInfo')
                        .leftJoinAndSelect('fundTransactionInfo.fundTransaction', 'fundTransaction')
                        .leftJoinAndSelect('recipient.recipientStatus', 'recipientStatus')
                        .where('fundTransactionInfo.fundTransactionId = :grantId', {
                            grantId
                        })
                        .getOne();

                    recipients[grantId] = recipient;

                    // Ensure that the current value of the RecipientStatus the requesting user is expecting on the associated Recipient record accurately reflects the database
                    if (
                        recipients[grantId].recipientStatus.name !==
                        vars.expectedCurrentRecipientStatusValue
                    ) {
                        throw new ConflictError(
                            `Unable to complete action for charity ${recipients[grantId].name}, because a newer version of the record exists.`
                        );
                    }

                    recipients[grantId].recipientStatus = newStatus;
                    recipients[grantId].recipientStatusId = newStatus.id;
                    recipients[grantId].vettedOn =
                        newStatus.name === RecipientStatusName.APPROVED ? new Date() : null;

                    const dueDiligenceEvent = await m.findOne(
                        TransactionEvent,
                        {
                            parentEventId: null,
                            fundTransactionId: grantId,
                            name: EventNameValue.DUE_DILIGENCE_STARTED
                        },
                        {
                            order: {
                                createdOn: 'DESC'
                            }
                        }
                    );

                    if (newStatus.name === RecipientStatusName.APPROVED && !!dueDiligenceEvent) {
                        recipient.fundDestinations.map(async info => {
                            await m.save(
                                m.create(TransactionEvent, {
                                    fundTransactionId: info.fundTransaction.id,
                                    name: EventNameValue.CHARITY_VETTED,
                                    createdBy: profile.id,
                                    updatedBy: profile.id,
                                    userProfileId: profile.id,
                                    parentEventId: dueDiligenceEvent.id
                                })
                            );
                        });
                    }

                    delete recipients[grantId].fundDestinations;

                    await m.save(recipients[grantId]);
                }
            }
        });
        return {
            operation: GrantOperations.UPDATE_CHARITY_STATUS,
            grantIds,
            expectedCurrentRecipientStatusValue: vars.newRecipientStatusValue,
            newRecipientStatusValue: vars.expectedCurrentRecipientStatusValue
        };
    }

    protected async togglePurposeNotesApproved(
        context: GraphQLContext,
        grantIds: string[],
        vars: UpdateBooleanVars
    ): Promise<GrantUpdateResponse> {
        // Ensure fields that are exposed as nullable via the API actually are present
        if (!this.isValidUpdateBooleanInput(vars))
            this.throwInvalidBooleanInputsError(GrantOperations.TOGGLE_PURPOSE_NOTES_APPROVED);

        const manager = context.typeorm.manager;
        const profile = await this.getCurrentUserProfile(context);

        await manager.transaction(async m => {
            for (const grantId of grantIds) {
                const grant = await m.findOne(FundTransaction, { id: grantId });
                const fundTransactionInfo = await m.findOne(FundTransactionInfo, {
                    fundTransactionId: grantId
                });

                // Ensure that the current value of the purposeNotesApproved flag the requesting user is expecting on the associated FundTransactionInfo accurately reflects the database
                if (fundTransactionInfo.purposeNotesApproved !== vars.expectedCurrentBooleanValue) {
                    throw new ConflictError(
                        'Unable to complete action, because a newer version of the record exists.'
                    );
                }

                fundTransactionInfo.purposeNotesApproved = vars.newBooleanValue;

                await m.save(fundTransactionInfo);
                await grantUtil.saveGrant(m, grant, profile.id);

                const dueDiligenceEvent = await m.findOne(
                    TransactionEvent,
                    {
                        parentEventId: null,
                        fundTransactionId: grantId,
                        name: EventNameValue.DUE_DILIGENCE_STARTED
                    },
                    {
                        order: {
                            createdOn: 'DESC'
                        }
                    }
                );

                if (vars.newBooleanValue === true && !!dueDiligenceEvent) {
                    await m.save(
                        m.create(TransactionEvent, {
                            createdBy: profile.id,
                            updatedBy: profile.id,
                            userProfileId: profile.id,
                            fundTransactionId: grantId,
                            name: EventNameValue.PURPOSE_NOTES_APPROVED,
                            parentEventId: dueDiligenceEvent.id
                        })
                    );
                }
            }
        });

        return {
            operation: GrantOperations.TOGGLE_PURPOSE_NOTES_APPROVED,
            grantIds,
            expectedCurrentBooleanValue: vars.newBooleanValue,
            newBooleanValue: vars.expectedCurrentBooleanValue
        };
    }

    protected async toggleSpecialInstructionsApproved(
        context: GraphQLContext,
        grantIds: string[],
        vars: UpdateBooleanVars
    ): Promise<GrantUpdateResponse> {
        // Ensure fields that are exposed as nullable via the API actually are present
        if (!this.isValidUpdateBooleanInput(vars))
            this.throwInvalidBooleanInputsError(
                GrantOperations.TOGGLE_SPECIAL_INSTRUCTIONS_APPROVED
            );

        const manager = context.typeorm.manager;
        const profile = await this.getCurrentUserProfile(context);

        await manager.transaction(async m => {
            for (const grantId of grantIds) {
                const grant = await m.findOne(FundTransaction, {
                    id: grantId
                });
                const fundTransactionInfo = await m.findOne(FundTransactionInfo, {
                    fundTransactionId: grantId
                });

                // Ensure that the current value of the purposeNotesApproved flag the requesting user is expecting on the associated FundTransactionInfo accurately reflects the database
                if (
                    fundTransactionInfo.specialInstructionsApproved !==
                    vars.expectedCurrentBooleanValue
                ) {
                    throw new ConflictError(
                        'Unable to complete action, because a newer version of the record exists.'
                    );
                }

                fundTransactionInfo.specialInstructionsApproved = vars.newBooleanValue;

                await m.save(fundTransactionInfo);
                await grantUtil.saveGrant(m, grant, profile.id);

                const dueDiligenceEvent = await m.findOne(
                    TransactionEvent,
                    {
                        parentEventId: null,
                        fundTransactionId: grantId,
                        name: EventNameValue.DUE_DILIGENCE_STARTED
                    },
                    {
                        order: {
                            createdOn: 'DESC'
                        }
                    }
                );

                if (vars.newBooleanValue === true && !!dueDiligenceEvent) {
                    await m.save(
                        m.create(TransactionEvent, {
                            createdBy: profile.id,
                            updatedBy: profile.id,
                            userProfileId: profile.id,
                            fundTransactionId: grantId,
                            name: EventNameValue.SPECIAL_INSTRUCTIONS_APPROVED,
                            parentEventId: dueDiligenceEvent.id
                        })
                    );
                }
            }
        });

        return {
            operation: GrantOperations.TOGGLE_SPECIAL_INSTRUCTIONS_APPROVED,
            grantIds,
            expectedCurrentBooleanValue: vars.newBooleanValue,
            newBooleanValue: vars.expectedCurrentBooleanValue
        };
    }

    protected async toggleAvailableBalanceApproved(
        context: GraphQLContext,
        grantIds: string[],
        vars: UpdateBooleanVars
    ): Promise<GrantUpdateResponse> {
        // Ensure fields that are exposed as nullable via the API actually are present
        if (!this.isValidUpdateBooleanInput(vars))
            this.throwInvalidBooleanInputsError(GrantOperations.TOGGLE_AVAILABLE_BALANCE_APPROVED);

        const manager = context.typeorm.manager;
        const profile = await this.getCurrentUserProfile(context);

        await manager.transaction(async m => {
            for (const grantId of grantIds) {
                const grant = await m.findOne(
                    FundTransaction,
                    { id: grantId },
                    {
                        relations: [
                            'transactionDetails',
                            'transactionDetails.transactionDetailType',
                            'transactionDetails.transactionDetailStatus'
                        ]
                    }
                );

                // Ensure that the current value of the purposeNotesApproved flag the requesting user is expecting on the associated FundTransactionInfo accurately reflects the database
                if (grant.availableBalanceApproved !== vars.expectedCurrentBooleanValue) {
                    throw new ConflictError(
                        'Unable to complete action, because a newer version of the record exists.'
                    );
                }

                grant.availableBalanceApproved = vars.newBooleanValue;

                const dueDiligenceEvent = await m.findOne(
                    TransactionEvent,
                    {
                        parentEventId: null,
                        fundTransactionId: grantId,
                        name: EventNameValue.DUE_DILIGENCE_STARTED
                    },
                    {
                        order: {
                            createdOn: 'DESC'
                        }
                    }
                );

                if (vars.newBooleanValue === true && !!dueDiligenceEvent) {
                    await m.save(
                        m.create(TransactionEvent, {
                            createdBy: profile.id,
                            updatedBy: profile.id,
                            userProfileId: profile.id,
                            fundTransactionId: grantId,
                            name: EventNameValue.AVAILABLE_BALANCE_APPROVED,
                            parentEventId: dueDiligenceEvent.id
                        })
                    );
                }
                await grantUtil.saveGrant(m, grant, profile.id);
            }
        });

        return {
            operation: GrantOperations.TOGGLE_AVAILABLE_BALANCE_APPROVED,
            grantIds,
            expectedCurrentBooleanValue: vars.newBooleanValue,
            newBooleanValue: vars.expectedCurrentBooleanValue
        };
    }
    protected async requestBypass(
        context: GraphQLContext,
        grantIds: string[],
        vars: UpdateBooleanVars
    ): Promise<GrantUpdateResponse> {
        if (!this.isValidUpdateBooleanInput(vars))
            this.throwInvalidBooleanInputsError(GrantOperations.TOGGLE_FINAL_REVIEW_APPROVED);

        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);
        await manager.transaction(async m => {
            const grants = await m.getRepository(FundTransaction).find({
                where: { id: In(grantIds) }
            });
            for (const grant of grants) {
                if (
                    grant.finalReview !== vars.expectedCurrentBooleanValue ||
                    grant.bypassRequested !== vars.expectedCurrentBooleanValue
                )
                    throw new ConflictError(
                        `Unable to complete action for grant ${grant.transactionCode}, because a newer version of the record exists.`
                    );

                grant.bypassRequested = vars.newBooleanValue;
                grant.finalReview = vars.newBooleanValue;
                grant.onHold = false;

                await grantUtil.saveGrant(m, grant, profile.id);
            }
        });

        return {
            operation: GrantOperations.TOGGLE_APPROVE_WITHOUT_DIVESTMENTS,
            grantIds,
            expectedCurrentBooleanValue: vars.newBooleanValue,
            newBooleanValue: vars.expectedCurrentBooleanValue
        };
    }

    protected async toggleFinalReviewApproved(
        context: GraphQLContext,
        grantIds: string[],
        vars: UpdateBooleanVars
    ): Promise<GrantUpdateResponse> {
        // Ensure fields that are exposed as nullable via the API actually are present
        if (!this.isValidUpdateBooleanInput(vars))
            this.throwInvalidBooleanInputsError(GrantOperations.TOGGLE_FINAL_REVIEW_APPROVED);

        const manager = context.typeorm.manager;
        const fundRepo = manager.getCustomRepository(FundRepository);
        const fundTransactionRepo = manager.getRepository(FundTransaction);
        const commentRepo = manager.getRepository(FundTransactionComment);
        const eventRepo = manager.getRepository(TransactionEvent);

        const profile = await this.getCurrentUserProfile(context);

        // boolean to track grants with errors
        let insufficientFundError = false;
        let notCoverDivestmentError = false;

        const systemProfile = await manager
            .createQueryBuilder(UserProfile, 'userProfile')
            .where('id = :systemUserId', { systemUserId: SYSTEM_USER_ID })
            .getOne();

        const grants = await fundTransactionRepo.find({
            where: { id: In(grantIds) },
            relations: [
                'transactionDetails',
                'transactionDetails.transactionDetailType',
                'transactionDetails.transactionDetailStatus'
            ]
        });

        const fundIdsWithNegativeBalances = await fundsWithoutBalanceFromFundTransactions(
            grants,
            fundRepo
        );

        const commentInserts: FundTransactionComment[] = [];
        const eventInserts: TransactionEvent[] = [];
        const errors: string[] = [];

        for (const grant of grants) {
            // validate `finalReview` boolean
            if (grant.finalReview !== vars.expectedCurrentBooleanValue) {
                // capture transaction code
                errors.push(grant.transactionCode);
                // move on to next grant
                continue;
            }

            const hasHoldingsToCoverDivestment = await hasHoldingsToCoverDivestmentAllocations(manager, grant);

            if (!fundIdsWithNegativeBalances.includes(grant.fundId) && hasHoldingsToCoverDivestment) {
                const reviewEvent = await eventRepo.findOne({
                    where: {
                        parentEventId: null,
                        fundTransactionId: grant.id,
                        name: EventNameValue.REVIEW_STARTED
                    },
                    order: { createdOn: 'DESC' }
                });

                if (vars.newBooleanValue === true && !!reviewEvent) {
                    eventInserts.push(
                        eventRepo.create({
                            createdBy: profile.id,
                            updatedBy: profile.id,
                            userProfileId: profile.id,
                            fundTransactionId: grant.id,
                            name: EventNameValue.FINAL_REVIEW_APPROVED,
                            parentEventId: reviewEvent.id
                        })
                    );
                }

                // update grant
                grant.bypassRequested = false;
                grant.finalReview = vars.newBooleanValue;
            } else {
                // create events and comments
                const lastMajorEvent = await eventRepo.findOne({
                    where: {
                        parentEventId: null,
                        fundTransactionId: grant.id
                    },
                    order: { createdOn: 'DESC' }
                });

                if (fundIdsWithNegativeBalances.includes(grant.fundId)) {
                    insufficientFundError = true;
                    commentInserts.push(
                        commentRepo.create({
                            fundTransactionId: grant.id,
                            transactionStatusId: grant.transactionStatusId,
                            isHold: true,
                            isCancel: false,
                            comment: '__INSUFFICIENTFUNDS__',
                            createdBy: systemProfile.id,
                            updatedBy: systemProfile.id
                        })
                    );
                } else {
                    const proposedDetails = await createProposedDetails(manager, grant.id);
                    grant.metadata = {
                        ...grant.metadata,
                        proposedDetails: proposedDetails
                    };
                    notCoverDivestmentError = true;
                    commentInserts.push(
                        commentRepo.create({
                            fundTransactionId: grant.id,
                            transactionStatusId: grant.transactionStatusId,
                            isHold: true,
                            isCancel: false,
                            comment: '__NOTCOVERDIVESTMENT__',
                            createdBy: systemProfile.id,
                            updatedBy: systemProfile.id
                        })
                    );
                }

                eventInserts.push(
                    eventRepo.create({
                        createdBy: systemProfile.id,
                        updatedBy: systemProfile.id,
                        userProfileId: systemProfile.id,
                        fundTransactionId: grant.id,
                        name: EventNameValue.ON_HOLD,
                        parentEventId: lastMajorEvent.id
                    })
                );

                // update grant
                grant.onHold = true;
                grant.bypassRequested = false;
            }
            await grantUtil.saveGrant(manager, grant, profile.id);
        }

        await bulkSave(commentInserts, commentRepo, 'insert', true);
        await bulkSave(eventInserts, eventRepo, 'insert', true);

        // throw errors
        if (errors.length) {
            const errorString = errors.join(', ').replace(/, ([^,]*)$/, ' and $1');
            throw new ConflictError(
                `Unable to complete action for grant ${errorString} because a newer version of the record exists.`
            );
        }
        if (insufficientFundError) {
            throw new InsufficientFundsError(
                'Some grants were unable to be processed due to insufficient holdings.'
            );
        } else if (notCoverDivestmentError) {
            throw new NotCoverDivestmentError(
                'This Fund has Divestment Fallback turned off and does not have a sufficient invested balance in the designated divestment account(s) to pay the Grant. You may attempt to Approve it again once the fund has a sufficient invested balance, or you can Bypass Divestments to move the Grant into Payments without divesting the grant amount.'
            );
        }

        return {
            operation: GrantOperations.TOGGLE_FINAL_REVIEW_APPROVED,
            grantIds,
            expectedCurrentBooleanValue: vars.newBooleanValue,
            newBooleanValue: vars.expectedCurrentBooleanValue
        };
    }

    @PermissionLock(PermissionAccessType.ADMIN_GRANTS_SPECIAL_APPROVAL, PermissionAccessLevel.FULL)
    protected async toggleSpecialApprovalGiven(
        context: GraphQLContext,
        grantIds: string[],
        vars: UpdateBooleanVars
    ): Promise<GrantUpdateResponse> {
        // Ensure fields that are exposed as nullable via the API actually are present
        if (!this.isValidUpdateBooleanInput(vars))
            this.throwInvalidBooleanInputsError(GrantOperations.TOGGLE_SPECIAL_APPROVAL_GIVEN);

        const manager = context.typeorm.manager;

        const profile = await this.getCurrentUserProfile(context);

        await manager.transaction(async m => {
            const grants = await m.getRepository(FundTransaction).find({
                where: { id: In(grantIds) },
                relations: [
                    'transactionDetails',
                    'transactionDetails.transactionDetailType',
                    'transactionDetails.transactionDetailStatus'
                ]
            });
            for (const grant of grants) {
                if (grant.specialApproval !== vars.expectedCurrentBooleanValue)
                    throw new ConflictError(
                        `Unable to complete action for grant ${grant.transactionCode}, because a newer version of the record exists.`
                    );

                grant.specialApproval = vars.newBooleanValue;

                const dueDiligenceEvent = await m.findOne(
                    TransactionEvent,
                    {
                        parentEventId: null,
                        fundTransactionId: grant.id,
                        name: EventNameValue.DUE_DILIGENCE_STARTED
                    },
                    {
                        order: {
                            createdOn: 'DESC'
                        }
                    }
                );

                if (vars.newBooleanValue === true && !!dueDiligenceEvent) {
                    await m.save(
                        m.create(TransactionEvent, {
                            createdBy: profile.id,
                            updatedBy: profile.id,
                            userProfileId: profile.id,
                            fundTransactionId: grant.id,
                            name: EventNameValue.SPECIAL_INSTRUCTIONS_APPROVED,
                            parentEventId: dueDiligenceEvent.id
                        })
                    );
                }
                await grantUtil.saveGrant(m, grant, profile.id);
            }
        });

        return {
            operation: GrantOperations.TOGGLE_SPECIAL_APPROVAL_GIVEN,
            grantIds,
            expectedCurrentBooleanValue: vars.newBooleanValue,
            newBooleanValue: vars.expectedCurrentBooleanValue
        };
    }
}
