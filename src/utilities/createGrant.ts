import dayjs from 'dayjs';
import { NotificationType } from '../../src/models/Notification';
import { EntityManager } from 'typeorm';
import { GraphQLContext } from '../context';
import { CreateGrantRecommendationInput } from '../inputs/FundTransaction/CreateGrantRecommendationInput';
import {
    Fund,
    FundTransaction,
    FundTransactionDetail,
    FundTransactionInfo,
    Tenant,
    TransactionDetailStatus,
    TransactionDetailType,
    TransactionEvent,
    TransactionRecurrence,
    TransactionStatus,
    TransactionType
} from '../models';
import { GLAccountTypeName } from '../models/GLAccountType';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { EventNameValue } from '../models/TransactionEvent';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionTypeValue } from '../models/TransactionType';
import { FundInvestmentRepository } from '../repositories/FundInvestment';
import { EmailService } from '../sendgrid';
import { accountingUtil } from '../utilities/accounting';
import { convertRRuleToString, createRRule } from '../utilities/getRruleForRecurringActions';
import { createProposedDetails } from '../utilities/transactionDetail';
import { determineIfFutureGrant, setToMidday } from './determineIfFutureGrant';
import { shouldSendNotification } from './email';
import { getTransactionCode } from './getTransactionCode';
import { largeIdentify, SegmentEvent, trackGrantCreated } from './segmentConfig';
import { TransactionMetadata } from '../models/FundTransactionMetadata';

export function createRecurrenceRecord(
    manager: EntityManager,
    input: CreateGrantRecommendationInput,
    fundId: string,
    recipientId: string,
    userProfileId: string,
    transactionTypeId: string,
    fundTransactionId?: string
): Promise<TransactionRecurrence> {
    const rruleInput = {
        startDate: input.recurringTiming.startOn,
        repeatInterval: input.recurringTiming.repeat,
        numberOfRecurrences: input.recurringTiming.numberOfRecurrences,
        endDate: input.recurringTiming.ends
    };
    const rrule = createRRule(rruleInput);
    const recurrenceRule = convertRRuleToString(rrule);

    return manager.save(
        manager.create(TransactionRecurrence, {
            fundId: fundId,
            recipientId: recipientId,
            transactionTypeId: transactionTypeId,
            recurrenceRule: recurrenceRule,
            createdBy: userProfileId,
            updatedBy: userProfileId,
            transactionRef: {
                fundId: fundId,
                amount: input.amount,
                originalFundTransactionId: fundTransactionId || null,
                purposeNotes: input.purposeNotes,
                purposeCategory: input.purposeCategory,
                includeFundNameInRecognition: input.includeFundNameInRecognition,
                includeDonorNameInRecognition: input.includeDonorNameInRecognition,
                includeDonorAddressInRecognition: input.includeDonorAddressInRecognition,
                specialInstructions: input.specialInstructions
            },
            recipientName: input.recipientName,
            recipientNotes: input.recipientNotes
        })
    );
}

export function createInfoRecord(
    manager: EntityManager,
    input: CreateGrantRecommendationInput,
    fundTransactionId: string,
    recipientId: string,
    userProfileId: string,
    requestedProcessDate: Date
): Promise<FundTransactionInfo> {
    return manager.save(
        manager.create(FundTransactionInfo, {
            fundTransactionId: fundTransactionId,
            recipientId: recipientId,
            purposeNotes: input.purposeNotes,
            purposeCategory: input.purposeCategory,
            includeFundNameInRecognition: input.includeFundNameInRecognition,
            includeDonorNameInRecognition: input.includeDonorNameInRecognition,
            includeDonorAddressInRecognition: input.includeDonorAddressInRecognition,
            // require approval if purpose notes is defined
            purposeNotesApproved: input.purposeNotes ? false : null,
            specialInstructions: input.specialInstructions,
            // require approval if special instructions is defined
            specialInstructionsApproved: input.specialInstructions ? false : null,
            specialRecognition: input.specialRecognition,
            requestedProcessDate,
            createdBy: userProfileId,
            updatedBy: userProfileId
        })
    );
}

export function extractGrantPropertiesFromInput(
    input: CreateGrantRecommendationInput,
    recipientId: string,
    tenant: Tenant
): {
    scheduledDate: Date | null;
    amount: number;
    specialApproval: boolean;
    metadata: TransactionMetadata | null;
} {
    const isSeries = input.recurringTiming?.startOn;
    const isOneTimeScheduled = !!input.oneTimeGrantTiming?.payBy && !input.recurringTiming;

    let scheduledDate: Date = null;
    if (isSeries) scheduledDate = input.recurringTiming.startOn as unknown as Date;
    else if (isOneTimeScheduled) scheduledDate = determineIfFutureGrant(input);
    else if (input.scheduledDate) scheduledDate = setToMidday(input.scheduledDate);
    else scheduledDate = null

    return {
        // fallback to today
        scheduledDate: scheduledDate ?? setToMidday(dayjs().add(5, 'day').toDate()),
        amount: Math.abs(input.amount) * -1, // Convert to negative as this type of transaction is a withdrawal from the fund
        specialApproval:
            input.amount > tenant.appSetting.specialApprovalThreshold || input.amount > 500000 ? false : null,
        metadata:
            !recipientId && input.recipientName
                ? {
                    recipientInfo: {
                        recipientName: input.recipientName,
                        recipientNotes: input.recipientNotes || ''
                    }
                }
                : null
    };
}

// params were getting numerous, so create an object with "override" options
interface OverrideOptions {
    context?: GraphQLContext;
    createdByAdmin?: string;
    isImpersonated?: boolean;
    skipTracking?: boolean;
    skipEmail?: boolean;
}

interface CreateGrantArgs {
    manager: EntityManager;
    recipientId: string;
    userProfileId: string;
    transactionType: TransactionType;
    input: CreateGrantRecommendationInput;
    overrideOptions?: OverrideOptions;

    initiator?: string;
}

export const createGrant = async (
    manager: EntityManager,
    recipientId: string,
    userProfileId: string,
    transactionType: TransactionType,
    input: CreateGrantRecommendationInput,
    overrideOptions?: OverrideOptions,
    /**
        Purely for logging purposes. 
        Allows us to differentiate between `createGrant` being called from the UI or from `processRecurringGrants`.
     */
    initiator?: string
): Promise<FundTransaction> => {
    /* 
        The goal for this log label is to capture:
        - Function name
        - Calling function if applicable (initially processRecurringGrants)
        - Fund ID

        This way we can query stored logs for a thread of events for a single invocation of createGrant. 
        Including the Fund ID serves as an invocation ID so we can query for a single thread of logs per invocation and not risk logs mixing together.
    */
    const logLabel = `createGrant${initiator ? `:${initiator}` : ''}:${input.fundId}`;
    // console.group(logLabel);
    // console.time(logLabel);
    // console.info(`${logLabel}: started`); // including the logLabel with each log until we see how GCP displays log groups

    // Get tenant
    const tenant = await manager.getRepository(Tenant).findOne();

    // TODO: remove - likely an artifact from earlier development
    const grantApprovalDisabled = process.env.GRANT_APPROVAL_ENABLED === 'false';

    let grantInstance = null;
    const IS_GRANT_SERIES = !!input.recurringTiming?.startOn;
    const ONE_TIME_SCHEDULED = !!input.oneTimeGrantTiming?.payBy;
    const IS_ONE_TIME_SCHEDULED = ONE_TIME_SCHEDULED && !input.recurringTiming;
    const ASAP_GRANT = !IS_GRANT_SERIES && !IS_ONE_TIME_SCHEDULED;

    const _30daysFromNow = dayjs()
        .add(30, 'day')
        .utc()
        .format('MM/DD/YYYY');
    const seriesFirstScheduledDate = input.recurringTiming?.startOn;
    const isBefore30Days = dayjs(seriesFirstScheduledDate).isBefore(_30daysFromNow);
    const divestTxStatus =
        IS_ONE_TIME_SCHEDULED || IS_GRANT_SERIES
            ? TransactionDetailStatusValue.SCHEDULED
            : TransactionDetailStatusValue.READY_FOR_DIVESTMENT;

    const paymentTxStatus =
        IS_ONE_TIME_SCHEDULED || IS_GRANT_SERIES
            ? TransactionDetailStatusValue.SCHEDULED
            : TransactionDetailStatusValue.READY_FOR_PAYMENT;

    const [
        transactionCode,
        transactionStatus,
        divestmentCashTransactionDetailStatus,
        paymentCashTransactionDetailStatus,
        divestmentCashTransactionDetailType,
        paymentCashTransactionDetailType,
        grantCashFundInvestment,
        fund,
        glAccounts
    ] = await Promise.all([
        getTransactionCode(transactionType, manager),
        manager.findOne(TransactionStatus, {
            name: TransactionStatusValue.SUBMITTED
        }),
        manager.findOne(TransactionDetailStatus, {
            name: grantApprovalDisabled ? divestTxStatus : TransactionDetailStatusValue.PENDING
        }),
        manager.findOne(TransactionDetailStatus, {
            name: grantApprovalDisabled ? paymentTxStatus : TransactionDetailStatusValue.PENDING
        }),
        manager.findOne(TransactionDetailType, {
            name: TransactionDetailTypeName.GRANT_DIVESTMENT_CASH
        }),
        manager.findOne(TransactionDetailType, {
            name: TransactionDetailTypeName.CASH_OUT
        }),
        manager
            .getCustomRepository(FundInvestmentRepository)
            .getGrantCashInvestmentForFund(input.fundId),
        manager.findOne(Fund, {
            where: { id: input.fundId },
            relations: ['userProfiles']
        }),
        accountingUtil.getGLAccountsByType(manager)
    ]);

    console.info(`${logLabel}: initial data gathered.`);

    const fundTransaction = await manager.transaction(async dbTransaction => {
        console.info(`${logLabel}: database transaction started.`);

        // create recurrence rule for new series
        let recurrence = null;
        if (IS_GRANT_SERIES) {
            recurrence = await createRecurrenceRecord(
                dbTransaction,
                input,
                fund.id,
                recipientId,
                userProfileId,
                transactionType.id
            );
            console.info(`${logLabel}: createRecurrenceRecord`);
        }

        const extractedProperties = extractGrantPropertiesFromInput(input, recipientId, tenant);

        // create series OR grant record
        const fundTransaction = await dbTransaction.save(
            dbTransaction.create(FundTransaction, {
                fundId: fund.id,
                transactionCode,
                transactionRecurrenceId: !!recurrence
                    ? recurrence.id
                    : input?.parentRecurrenceId ?? null,
                transactionTypeId: transactionType.id,
                transactionStatusId: transactionStatus.id,
                createdBy: userProfileId,
                userProfileId: userProfileId,
                createdByAdminId: overrideOptions?.createdByAdmin,
                updatedBy: userProfileId,
                originalFundTransactionId: input.originalFundTransactionId,
                ...extractedProperties
            })
        );
        console.info(`${logLabel}: fund transaction created`);

        // create first instance of grant series
        if (IS_GRANT_SERIES && isBefore30Days) {
            const grantTransactionType = await dbTransaction.findOne(TransactionType, {
                name: TransactionTypeValue.GRANT
            });
            const instanceTransactionCode = await getTransactionCode(
                grantTransactionType,
                dbTransaction
            );

            grantInstance = await dbTransaction.save(
                dbTransaction.create(FundTransaction, {
                    fundId: fund.id,
                    transactionCode: instanceTransactionCode,
                    transactionRecurrenceId: !!recurrence ? recurrence.id : null,
                    transactionTypeId: grantTransactionType.id,
                    transactionStatusId: transactionStatus.id,
                    createdBy: userProfileId,
                    userProfileId: userProfileId,
                    createdByAdminId: overrideOptions?.createdByAdmin,
                    updatedBy: userProfileId,
                    originalFundTransactionId: fundTransaction.id,
                    ...extractedProperties
                })
            );
            console.info(`${logLabel}: first instance of recurring grant created`);
        }
        if (IS_GRANT_SERIES && !!recurrence) {
            recurrence.transactionRef.originalFundTransactionId = fundTransaction.id;
            await dbTransaction.save(recurrence);
            console.info(`${logLabel}: save new fund transaction ID on recurrence record`);
        }

        await createInfoRecord(
            dbTransaction,
            input,
            fundTransaction.id,
            recipientId,
            userProfileId,
            extractedProperties.scheduledDate
        );
        console.info(`${logLabel}: createInfoRecord`);

        // Create TransactionEvent
        await dbTransaction.save(
            dbTransaction.create(TransactionEvent, {
                fundTransactionId: fundTransaction.id,
                name: EventNameValue.SUBMITTED,
                createdBy: userProfileId,
                updatedBy: userProfileId,
                userProfileId: userProfileId
            })
        );
        console.info(`${logLabel}: create transaction event`);

        // Create Fund Transaction Details
        await dbTransaction.save(
            dbTransaction.create(FundTransactionDetail, {
                fundTransactionId: fundTransaction.id,
                transactionDetailTypeId: divestmentCashTransactionDetailType.id,
                transactionDetailStatusId: divestmentCashTransactionDetailStatus.id,
                fundInvestmentId: grantCashFundInvestment.id,
                amount: fundTransaction.amount,
                createdBy: userProfileId,
                updatedBy: userProfileId
            })
        );
        console.info(`${logLabel}: create fund transaction detail`);

        await dbTransaction.save(
            dbTransaction.create(FundTransactionDetail, {
                fundTransactionId: fundTransaction.id,
                transactionDetailTypeId: paymentCashTransactionDetailType.id,
                transactionDetailStatusId: paymentCashTransactionDetailStatus.id,
                fundInvestmentId: grantCashFundInvestment.id,
                amount: fundTransaction.amount,
                createdBy: userProfileId,
                updatedBy: userProfileId,
                sourceAccountId: glAccounts[GLAccountTypeName.GRANT_DISBURSEMENT].id,
                destinationAccountId: glAccounts[GLAccountTypeName.GRANT_RECIPIENT].id
            })
        );
        console.info(`${logLabel}: create another fund transaction detail with source and destination account`);

        // Create Fund Transaction Details for series instances, etc
        if (IS_GRANT_SERIES && !!grantInstance) {
            console.info(`${logLabel}: create fund transaction details for series`);
            await dbTransaction.save(
                dbTransaction.create(FundTransactionDetail, {
                    fundTransactionId: grantInstance.id,
                    transactionDetailTypeId: divestmentCashTransactionDetailType.id,
                    transactionDetailStatusId: divestmentCashTransactionDetailStatus.id,
                    fundInvestmentId: grantCashFundInvestment.id,
                    amount: fundTransaction.amount,
                    createdBy: userProfileId,
                    updatedBy: userProfileId
                })
            );
            console.info(`${logLabel}: create fund transaction details for series: transaction detail`);
            await dbTransaction.save(
                dbTransaction.create(FundTransactionDetail, {
                    fundTransactionId: grantInstance.id,
                    transactionDetailTypeId: paymentCashTransactionDetailType.id,
                    transactionDetailStatusId: paymentCashTransactionDetailStatus.id,
                    fundInvestmentId: grantCashFundInvestment.id,
                    amount: fundTransaction.amount,
                    createdBy: userProfileId,
                    updatedBy: userProfileId,
                    sourceAccountId: glAccounts[GLAccountTypeName.GRANT_DISBURSEMENT].id,
                    destinationAccountId: glAccounts[GLAccountTypeName.GRANT_RECIPIENT].id
                })
            );
            console.info(`${logLabel}: create fund transaction details for series: transaction detail with source and destination account`);

            await createInfoRecord(
                dbTransaction,
                input,
                grantInstance.id,
                recipientId,
                userProfileId,
                extractedProperties.scheduledDate
            );
            console.info(`${logLabel}: create fund transaction details for series: info record`);

            // Create TransactionEvent
            await dbTransaction.save(
                dbTransaction.create(TransactionEvent, {
                    fundTransactionId: grantInstance.id,
                    name: EventNameValue.SUBMITTED,
                    createdBy: userProfileId,
                    updatedBy: userProfileId,
                    userProfileId: userProfileId
                })
            );
            console.info(`${logLabel}: create fund transaction details for series: transaction event`);
        }

        const sendNotification = await shouldSendNotification(
            dbTransaction,
            userProfileId,
            IS_GRANT_SERIES
                ? NotificationType.GRANT_RECURRING_REQUEST
                : NotificationType.GRANT_ONE_TIME_REQUEST,
            fund.id
        );
        console.info(`${logLabel}: shouldSendNotification`);

        // Send emails (skip when explicitly set to false)
        if (
            process.env.NODE_ENV !== 'development' &&
            overrideOptions?.skipEmail !== true &&
            sendNotification
        ) {
            const emailService =
                overrideOptions?.context?.email || new EmailService();
            await emailService.sendGrantRecommendationCreatedEmails(
                dbTransaction,
                fundTransaction.id
            );
            console.info(`${logLabel}: sendGrantRecommendationCreatedEmails`);
        }else{
            console.info(`${logLabel}: Adding Email Queue Failed  - sendNotification: ${sendNotification} - Override Options Skip Email: ${overrideOptions?.skipEmail}`);
        }

        console.info(`${logLabel}: database transaction finished.`);

        return fundTransaction;
    });

    if (ASAP_GRANT) {
        try {
            console.info(`${logLabel}: createProposedDetails started.`);
            const proposedDetails = await createProposedDetails(
                manager,
                fundTransaction.id
            );
            console.info(`${logLabel}: createProposedDetails finished.`);
            fundTransaction.metadata = {
                ...fundTransaction.metadata,
                proposedDetails: proposedDetails
            };
            await manager.save(fundTransaction);
            console.info(`${logLabel}: createProposedDetails saved.`);
        } catch (error) {
            // Can error due to the fund not having sufficient funds to create proposed details (divestment instructions)
            console.error(`Unable to create detail metadata for grant ${fundTransaction.transactionCode}: ${error}`);
        }
    }

    if (
        !overrideOptions?.createdByAdmin &&
        !overrideOptions?.isImpersonated &&
        !overrideOptions?.skipTracking &&
        recipientId
    ) {
        if (!!input.recurringTiming) {
            largeIdentify(manager, userProfileId);
            trackGrantCreated(
                manager,
                userProfileId,
                fund,
                recipientId,
                SegmentEvent.RECURRING_GRANT_ADDED
            );
        } else {
            trackGrantCreated(
                manager,
                userProfileId,
                fund,
                recipientId,
                SegmentEvent.GRANT_RECOMMENDED
            );
        }
    }

    console.timeEnd(logLabel);
    console.info(`${logLabel}: finished for fund_id ${input.fundId}`);
    console.groupEnd();

    return fundTransaction;
};
