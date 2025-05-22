import dayjs from 'dayjs';
import _ from 'lodash';
import Stripe from 'stripe';
import { EntityManager } from 'typeorm';

import { NotificationType } from '../../src/models/Notification';
import { GraphQLContext } from '../context';
import { CreateFundContributionInput } from '../inputs/FundTransaction/CreateFundContributionInput';
import { CreateManualFundContributionInput } from '../inputs/FundTransaction/CreateManualFundContributionInput';
import {
    Fund,
    FundInvestment,
    FundTransaction,
    FundTransactionDetail,
    FundTransactionSource,
    TransactionDetailStatus,
    TransactionDetailType,
    TransactionEvent,
    TransactionRecurrence,
    TransactionStatus,
    TransactionType,
    UserProfile,
    UserProfileAccount
} from '../models';
import { BatchPaymentTypeValue } from '../models/Batch';
import { DetailPaymentType } from '../models/FundTransactionDetail';
import { TransactionMetadata } from '../models/FundTransactionMetadata';
import { FundTransactionSourceStatusValue } from '../models/FundTransactionSource';
import { GLAccountTypeName } from '../models/GLAccountType';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { EventNameValue } from '../models/TransactionEvent';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionTypeValue } from '../models/TransactionType';
import { UserProfileAccountTypes } from '../models/UserProfileAccount';
import { plaidClient } from '../plaid';
import { FundInvestmentRepository } from '../repositories/FundInvestment';
import { FundTransactionDetailRepository } from '../repositories/FundTransactionDetail';
import { EmailService } from '../sendgrid';
import { getStripeClient } from '../stripe';
import { getOrCreateConnection } from '../typeorm';
import { accountingUtil } from '../utilities/accounting';
import { currency } from '../utilities/currency';
import { getOrCreateStripeCustomer } from '../utilities/getOrCreateStripeCustomer';
import { convertRRuleToString, createRRule } from '../utilities/getRruleForRecurringActions';
import { determineIfFutureGrant, setToMidday } from './determineIfFutureGrant';
import { getTransactionCode } from './getTransactionCode';
import { getTransactionDetailStatuses, getTransactionStatuses } from './getTransactionStatuses';
import {
    ContributionTypes,
    largeIdentify,
    trackRecurringContributionCreated,
    trackSingleContributionCreated
} from './segmentConfig';
import { shouldSendNotification } from './email';
import { transformRecurrenceRecIntoContributeToFundInput } from './transformContributionRefIntoContributeToFundInput';
import RecurringContributionError from '../errors/RecurringContribution';

interface OverrideOptions {
    context?: GraphQLContext;
    isImpersonated?: boolean;
    skipEmail?: boolean;
}

export const createContribution = async (
    manager: EntityManager,
    userProfileId: string,
    userProfileAccountId: string | null,
    transactionTypeId: string,
    input: CreateFundContributionInput,
    overrideOptions?: OverrideOptions
): Promise<FundTransaction> => {
    const stripeClient = getStripeClient();

    let stripeSource: Stripe.CustomerSource;
    let stripeCharge: Stripe.Charge;
    let contributionInstance = null;

    const IS_CONTRIBUTION_SERIES = !!input.recurringTiming?.startOn;
    const ONE_TIME_SCHEDULED = !!input.oneTimeGrantTiming?.payBy || !!input?.scheduledDate;
    const IS_ONE_TIME_SCHEDULED = ONE_TIME_SCHEDULED && !input.recurringTiming;
    const ASAP_CONTRIBUTION = !IS_CONTRIBUTION_SERIES && !IS_ONE_TIME_SCHEDULED;

    const _30daysFromNow = dayjs()
        .add(30, 'day')
        .utc()
        .format('MM/DD/YYYY');

    const seriesFirstScheduledDate = input.recurringTiming?.startOn;
    const isBefore30Days = dayjs(seriesFirstScheduledDate).isBefore(_30daysFromNow);

    const TXStatus = ASAP_CONTRIBUTION
        ? TransactionStatusValue.PENDING
        : TransactionStatusValue.SCHEDULED;

    const transactionStatus = await manager.findOne(TransactionStatus, {
        name: TXStatus
    });

    // Get Transaction Detail Status
    const transactionDetailStatus = await manager.findOne(TransactionDetailStatus, {
        name:
            process.env.WEBHOOKS_ENABLED === 'false' && ASAP_CONTRIBUTION
                ? TransactionDetailStatusValue.READY_FOR_INVESTMENT
                : !ASAP_CONTRIBUTION
                ? TransactionDetailStatusValue.SCHEDULED
                : TransactionDetailStatusValue.PENDING
    });

    // Get Fee Transaction Status
    const feeTransactionDetailStatus = await manager.findOne(TransactionDetailStatus, {
        name:
            process.env.WEBHOOKS_ENABLED === 'false' && ASAP_CONTRIBUTION
                ? TransactionDetailStatusValue.COMPLETE
                : !ASAP_CONTRIBUTION
                ? TransactionDetailStatusValue.SCHEDULED
                : TransactionDetailStatusValue.PENDING
    });

    const userProfile = await manager.findOne(UserProfile, {
        id: userProfileId
    });
    

    let userProfileAccount: UserProfileAccount;
    const fund = await manager.findOne(Fund, {
        where: { id: input.fundId },
        relations: ['userProfiles']
    });
    const transactionType = await manager.findOne(TransactionType, { id: transactionTypeId });
    const transactionCode = await getTransactionCode(transactionType, manager);
    const fundInvestments = await manager.find(FundInvestment, {
        fundId: input.fundId
    });
    
    const metaData = {
        'donorName':userProfile.fullName,
        'fundKey':fund.fundKey,
        'transactionCode':transactionCode,
    }

    
    const contributionCashFundInvestment = await manager
        .getCustomRepository(FundInvestmentRepository)
        .getContributionCashInvestmentForFund(input.fundId);

    const glAccounts = await accountingUtil.getGLAccountsByType(manager);

    // Validate percentages
    if (_.sumBy(fundInvestments, a => a.allocationPercentage * 100) / 100 !== 1)
        throw Error('Investment pool allocation percentages do not sum to 1.0');

    // Run DB calls in a transaction in case Plaid or Stripe API calls fail
    const fundTransaction = await manager.transaction(async dbTransaction => {
        const paymentDetails = {
            paymentType: null
        };
        let transactionSource: FundTransactionSource;
        let feeAmount: number;

        if (!!userProfileAccountId) {
            userProfileAccount = await manager.findOne(UserProfileAccount, {
                id: userProfileAccountId
            });

            if (ASAP_CONTRIBUTION) {
                // Check to see if profile is a current STRIPE Customer
                let stripeCustomer: Stripe.Customer;
                try {
                    stripeCustomer = await getOrCreateStripeCustomer(
                        userProfile,
                        stripeClient,
                        dbTransaction,
                        `${transactionStatus.name} :: ${fund.fundCode}`
                    );
                } catch (e) {
                    throw new RecurringContributionError(`createContribution(upid ${userProfileId}): Could not get or create Stripe customer: ${e.message}`)
                }

                // May need to update Profile with the new Stripe Customer
                if (userProfile.customerId !== stripeCustomer.id) {
                    userProfile.customerId = stripeCustomer.id;
                    await dbTransaction.save(userProfile);
                }

                // If Contribution is with a BANK_ACCOUNT, the Stripe Customer may not yet exist
                if (userProfileAccount.accountType === UserProfileAccountTypes.BANK_ACCOUNT) {
                    // Find stripe source matching Plaid account info
                    if (stripeCustomer.sources) {
                        const sources = stripeCustomer.sources.data as Stripe.Source[];
                        stripeSource = sources.find(
                            source =>
                                source.metadata.plaidItemId === userProfileAccount.itemId &&
                                source.metadata.plaidAccountId === userProfileAccount.accountId
                        ) as Stripe.Source;
                    }

                    // If stripe source matching this plaid account doesn't exist,
                    // create a new source from the bank account token provided by plaid
                    if (!stripeSource) {
                        let stripeToken: string;
                        try {
                            ({
                                stripe_bank_account_token: stripeToken
                            } = await plaidClient.createStripeToken(
                                userProfileAccount.accessToken,
                                userProfileAccount.accountId
                            ));

                        } catch (e) {
                            throw new RecurringContributionError(`createContribution(upid ${userProfileId}): Could not create stripe token: ${e.message}`)
                        }
                        try {
                            stripeSource = await stripeClient.customers.createSource(
                                stripeCustomer.id,
                                {
                                    source: stripeToken,
                                    metadata: {
                                        plaidItemId: userProfileAccount.itemId,
                                        plaidAccountId: userProfileAccount.accountId
                                    }
                                }
                            );

                        } catch (e) {
                            throw new RecurringContributionError(`createContribution(upid ${userProfileId}): Could not create new stripeSource for customer: ${e.message}`)
                        }
                    }

                    try {
                        stripeCharge = await stripeClient.charges.create({
                            amount: input.amount * 100, // Need to convert to cents
                            source: stripeSource.id,
                            currency: 'usd',
                            customer: stripeCustomer.id,
                            metadata: metaData,
                        });
                    } catch (e) {
                        throw new RecurringContributionError(`createContribution(upid ${userProfileId}): Could not create bank stripe charge: ${e.message}`)
                    }


                    paymentDetails.paymentType = BatchPaymentTypeValue.ACH;
                }

                // If the contribution is with a credit card, a Stripe Customer will already exist; create the charge
                if (userProfileAccount.accountType === UserProfileAccountTypes.CREDIT_CARD) {
                    try {
                        stripeCharge = await stripeClient.charges.create({
                            amount: input.amount * 100,
                            currency: 'usd',
                            customer: stripeCustomer.id,
                            source: userProfileAccount.paymentMethodId,
                            metadata: metaData,
                        });
                    } catch (e) {
                        throw new RecurringContributionError(`createContribution(upid ${userProfileId}): Could not create card stripe charge: ${e.message}`)
                    }
                    paymentDetails.paymentType = BatchPaymentTypeValue.CREDIT;
                }

                // Get STRIPE fee data
                let stripeBalanceTransaction: Stripe.Response<Stripe.BalanceTransaction>
                try {
                    stripeBalanceTransaction = await stripeClient.balanceTransactions.retrieve(
                        stripeCharge.balance_transaction as string
                    );
                } catch (e) {
                    throw new RecurringContributionError(`createContribution(upid ${userProfileId}): Could not complete balance transactions: ${e.message}`)
                }

                let feeAmountInCents: number;
                try {
                    feeAmountInCents = stripeBalanceTransaction.fee_details.reduce(
                        (sum: number, value: { amount: number }) => {
                            return currency.add(sum, value.amount);
                        },
                        0
                    );
                } catch (e) {
                    throw new RecurringContributionError(`createContribution(upid ${userProfileId}): Could not retrieve fee amount: ${e.message}`)
                }
                feeAmount = currency.divide(feeAmountInCents, 100);

                // Create Fund Transaction Source Record
                transactionSource = await dbTransaction.save(
                    dbTransaction.create(FundTransactionSource, {
                        isManual: false,
                        userProfileAccountId: userProfileAccount.id,
                        customerId: stripeCustomer.id,
                        chargeId: stripeCharge.id,
                        createdBy: userProfile.id,
                        updatedBy: userProfile.id,
                        status:
                            // skip to 'POSTED' if webhooks disabled
                            process.env.WEBHOOKS_ENABLED === 'false'
                                ? FundTransactionSourceStatusValue.POSTED
                                : FundTransactionSourceStatusValue.PENDING
                    })
                );
                console.log('createContribution : FundTransactionSource Created : ' + JSON.stringify(transactionSource));
            } // end asap contribution
            else {
                if (userProfileAccount.accountType === UserProfileAccountTypes.CREDIT_CARD) {
                    paymentDetails.paymentType = BatchPaymentTypeValue.CREDIT;
                } else if (
                    userProfileAccount.accountType === UserProfileAccountTypes.BANK_ACCOUNT
                ) {
                    paymentDetails.paymentType = BatchPaymentTypeValue.ACH;
                }
            }
        } // end userProfileAccountId true

        let recurrence = null;
        if (IS_CONTRIBUTION_SERIES) {
            const rruleInput = {
                startDate: input.recurringTiming.startOn,
                repeatInterval: input.recurringTiming.repeat,
                numberOfRecurrences: input.recurringTiming.numberOfRecurrences,
                endDate: input.recurringTiming.ends
            };
            const rrule = createRRule(rruleInput);
            const rruleStringified = convertRRuleToString(rrule);
            recurrence = await dbTransaction.save(
                dbTransaction.create(TransactionRecurrence, {
                    fundId: fund.id,
                    recipientId: null,
                    userProfileAccountId: userProfileAccountId,
                    transactionTypeId: transactionTypeId,
                    recurrenceRule: rruleStringified,
                    createdBy: userProfileId,
                    updatedBy: userProfileId,
                    transactionRef: {
                        fundId: fund.id,
                        userProfileAccountId: userProfileAccount.id,
                        amount: input.amount,
                        originalFundTransactionId: input.originalFundTransactionId || null
                    }
                })
            );
            console.log('createContribution : TransactionRecurrence Created : ' + JSON.stringify(recurrence));
            await dbTransaction
                .createQueryBuilder()
                .update(Fund)
                .set({
                    recurringContributionsDismissed: true
                })
                .where('id = :fundId', { fundId: fund.id })
                .execute();
                console.log('createContribution : Updated Fund ' + fund.id + ', set recurringContributionsDismissed to true');
        } // end contribution series

        const scheduledDate = !!input?.scheduledDate
            ? setToMidday(input.scheduledDate)
            : IS_ONE_TIME_SCHEDULED || IS_CONTRIBUTION_SERIES
            ? determineIfFutureGrant(input)
            : null;

        // Create Fund Transaction Record
        const fundTransaction = await dbTransaction.save(
            dbTransaction.create(FundTransaction, {
                fundId: fund.id,
                transactionCode,
                transactionRecurrenceId: !!recurrence
                    ? recurrence.id
                    : input?.parentRecurrenceId ?? null,
                transactionTypeId: transactionTypeId,
                fundTransactionSourceId: transactionSource?.id || null,
                amount: input.amount,
                transactionStatusId: transactionStatus.id,
                userProfileId: userProfileId,
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                originalFundTransactionId: input.originalFundTransactionId,
                metadata: JSON.parse(JSON.stringify({ paymentDetails })),
                userProfileAccountId: userProfileAccountId,
                scheduledDate: scheduledDate ?? new Date()
            })
        );
        console.log('createContribution : FundTransaction Created : ' + JSON.stringify(fundTransaction));

        // Fund TX instance creation
        if (IS_CONTRIBUTION_SERIES && isBefore30Days) {
            const instanceTransactionType = await manager.findOne(TransactionType, {
                name: TransactionTypeValue.CONTRIBUTION
            });
            const instanceTransactionCode = await getTransactionCode(
                instanceTransactionType,
                manager
            );
            contributionInstance = await dbTransaction.save(
                dbTransaction.create(FundTransaction, {
                    fundId: fund.id,
                    transactionCode: instanceTransactionCode,
                    transactionRecurrenceId: !!recurrence
                        ? recurrence.id
                        : input?.parentRecurrenceId ?? null,
                    transactionTypeId: instanceTransactionType.id,
                    fundTransactionSourceId: transactionSource?.id || null,
                    amount: input.amount,
                    transactionStatusId: transactionStatus.id,
                    userProfileId: userProfileId,
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    originalFundTransactionId: fundTransaction.id,
                    metadata: JSON.parse(JSON.stringify({ paymentDetails })),
                    userProfileAccountId: userProfileAccountId,
                    scheduledDate: !!input?.scheduledDate
                        ? setToMidday(input.scheduledDate)
                        : IS_ONE_TIME_SCHEDULED || IS_CONTRIBUTION_SERIES
                        ? determineIfFutureGrant(input)
                        : null
                })
            );
            console.log('createContribution : FundTransaction Created : ' + JSON.stringify(contributionInstance));
        }

        // Fund TX Details
        if (fundTransaction) {
            const feeTransactionDetailType = await manager.findOne(TransactionDetailType, {
                name: TransactionDetailTypeName.FEE
            });
            const cashTransactionDetailType = await manager.findOne(TransactionDetailType, {
                name: TransactionDetailTypeName.CASH_IN
            });

            // Create Fund Transaction Detail record for fee
            await dbTransaction.save(
                dbTransaction.create(FundTransactionDetail, {
                    fundTransactionId: fundTransaction.id,
                    transactionDetailTypeId: feeTransactionDetailType.id,
                    amount: (ASAP_CONTRIBUTION && feeAmount) || 0,
                    transactionDetailStatusId: feeTransactionDetailStatus.id,
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                    destinationAccountId: glAccounts[GLAccountTypeName.CREDIT_CARD_FEES].id
                })
            );
            console.log('createContribution : FundTransactionDetail Created : ' + JSON.stringify({
                fundTransactionId: fundTransaction.id,
                transactionDetailTypeId: feeTransactionDetailType.id,
                amount: (ASAP_CONTRIBUTION && feeAmount) || 0,
                transactionDetailStatusId: feeTransactionDetailStatus.id,
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                destinationAccountId: glAccounts[GLAccountTypeName.CREDIT_CARD_FEES].id
            }));
            // Create Fund Transaction Detail record for cash amount
            await dbTransaction.save(
                dbTransaction.create(FundTransactionDetail, {
                    fundTransactionId: fundTransaction.id,
                    transactionDetailTypeId: cashTransactionDetailType.id,
                    amount:
                        (ASAP_CONTRIBUTION &&
                            (!!feeAmount ? input.amount - feeAmount : input.amount)) ||
                        0,
                    transactionDetailStatusId: transactionDetailStatus.id,
                    fundInvestmentId: contributionCashFundInvestment.id,
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                    destinationAccountId: glAccounts[GLAccountTypeName.PRIMARY].id
                })
            );
            console.log('createContribution : FundTransactionDetail Created : ' + JSON.stringify({
                fundTransactionId: fundTransaction.id,
                transactionDetailTypeId: cashTransactionDetailType.id,
                amount:
                    (ASAP_CONTRIBUTION &&
                        (!!feeAmount ? input.amount - feeAmount : input.amount)) ||
                    0,
                transactionDetailStatusId: transactionDetailStatus.id,
                fundInvestmentId: contributionCashFundInvestment.id,
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                destinationAccountId: glAccounts[GLAccountTypeName.PRIMARY].id
            }));

            // instance fund tx details
            if (contributionInstance) {
                // fee instance TX
                await dbTransaction.save(
                    dbTransaction.create(FundTransactionDetail, {
                        fundTransactionId: contributionInstance.id,
                        transactionDetailTypeId: feeTransactionDetailType.id,
                        amount: 0,
                        transactionDetailStatusId: feeTransactionDetailStatus.id,
                        createdBy: userProfile.id,
                        updatedBy: userProfile.id,
                        sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                        destinationAccountId: glAccounts[GLAccountTypeName.CREDIT_CARD_FEES].id
                    })
                );
                console.log('createContribution : FundTransactionDetail Created : ' + JSON.stringify({
                    fundTransactionId: contributionInstance.id,
                    transactionDetailTypeId: feeTransactionDetailType.id,
                    amount: 0,
                    transactionDetailStatusId: feeTransactionDetailStatus.id,
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                    destinationAccountId: glAccounts[GLAccountTypeName.CREDIT_CARD_FEES].id
                }));
                // cash instance TX
                await dbTransaction.save(
                    dbTransaction.create(FundTransactionDetail, {
                        fundTransactionId: contributionInstance.id,
                        transactionDetailTypeId: cashTransactionDetailType.id,
                        amount: 0,
                        transactionDetailStatusId: transactionDetailStatus.id,
                        fundInvestmentId: contributionCashFundInvestment.id,
                        createdBy: userProfile.id,
                        updatedBy: userProfile.id,
                        sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                        destinationAccountId: glAccounts[GLAccountTypeName.PRIMARY].id
                    })
                );
                console.log('createContribution : FundTransactionDetail Created : ' + JSON.stringify({
                    fundTransactionId: contributionInstance.id,
                    transactionDetailTypeId: cashTransactionDetailType.id,
                    amount: 0,
                    transactionDetailStatusId: transactionDetailStatus.id,
                    fundInvestmentId: contributionCashFundInvestment.id,
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                    destinationAccountId: glAccounts[GLAccountTypeName.PRIMARY].id
                }));
            }
        }

        if (!!input.recurringTiming && !!recurrence) {
            recurrence.transactionRef.originalFundTransactionId = fundTransaction.id;
            await dbTransaction.save(recurrence);
        }

        // check env variable and params first
        let shouldSendNotificationEmail =
            process.env.NODE_ENV !== 'development' && overrideOptions?.skipEmail !== true;

        // if true, double-check with asynchronous action
        if (shouldSendNotificationEmail) {
            shouldSendNotificationEmail = await shouldSendNotification(
                manager,
                userProfile.id,
                NotificationType.CONTRIBUTION_CREATED,
                fund.id
            );
        }

        // Send email(s)
        if (shouldSendNotificationEmail) {
            const emailService =
                overrideOptions?.context?.email || new EmailService();
            try {
                await emailService.sendFundContributionCreatedEmails(dbTransaction, fundTransaction.id);
            } catch (e) {
                throw new Error(`createContribution(upid ${userProfileId}): could not send emails: ${e.message}`)
            }
        }
        console.log('createContribution : createContribution function end returning : ' + JSON.stringify(fundTransaction));
        return fundTransaction;
    }); // end transaction creating contribution

    const contributionType = fundTransaction.transactionRecurrence
        ? ContributionTypes.RECURRING
        : ContributionTypes.ONE_TIME;

    if (ASAP_CONTRIBUTION) {
        await manager.save(
            manager.create(TransactionEvent, {
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                userProfileId: userProfile.id,
                fundTransactionId: fundTransaction.id,
                name: EventNameValue.CREATED
            })
        );
    }

    if (!input.contributeOnBehalfOfDonorUserProfileId && !overrideOptions?.isImpersonated) {
        if (!!input.recurringTiming) {
            largeIdentify(manager, userProfile.id);
            trackRecurringContributionCreated(
                userProfileId,
                fund.name,
                fund.fundCode,
                userProfileAccount?.accountType || null
            );
        } else {
            trackSingleContributionCreated(
                userProfileId,
                fund.name,
                fund.fundCode,
                userProfileAccount?.accountType || null,
                contributionType,
                fundTransaction.amount
            );
        }
    }

    return fundTransaction;
};

export const createContributionForManualBatch = async (
    manager: EntityManager,
    userProfileId: string,
    transactionType: TransactionType,
    sourceAccount: string | null,
    destinationAccount: string | null,
    input: CreateManualFundContributionInput,
    context?: GraphQLContext
): Promise<FundTransactionDetail> => {
    // Get Transaction Status
    const transactionStatus = await manager.findOne(TransactionStatus, {
        name: TransactionStatusValue.PENDING
    });

    // Get Transaction Satus
    const transactionDetailStatus = await manager.findOne(TransactionDetailStatus, {
        name:
            process.env.WEBHOOKS_ENABLED === 'false'
                ? TransactionDetailStatusValue.READY_FOR_INVESTMENT
                : TransactionDetailStatusValue.PENDING
    });

    // Get Current User
    const userProfile = await manager.findOne(UserProfile, {
        id: userProfileId
    });

    // // Get userProfileAccount
    let userProfileAccount;
    // Get Fund
    const fund = await manager.findOne(Fund, {
        where: { id: input.fundId },
        relations: ['userProfiles']
    });

    const transactionCode = await getTransactionCode(transactionType, manager);

    //Get fund investments
    const fundInvestments = await manager.find(FundInvestment, {
        fundId: input.fundId
    });

    const contributionCashFundInvestment = await manager
        .getCustomRepository(FundInvestmentRepository)
        .getContributionCashInvestmentForFund(input.fundId);

    // Validate percentages
    if (_.sumBy(fundInvestments, a => a.allocationPercentage * 100) / 100 !== 1)
        throw Error('Investment pool allocation percentages do not sum to 1.0');

    const glAccounts = await accountingUtil.getGLAccountsByType(manager);

    // Run DB calls in a transaction in case Plaid or Stripe API calls fail
    const results = await manager.transaction(async dbTransaction => {
        let transactionSource: FundTransactionSource;
        let feeAmount: number;

        // // parse into JSON object and assigning them to the metadata column for the transaction records being created
        const newMetadata = {
            paymentDetails: {
                paymentType: input.paymentDetails.paymentType,
                securityId: input.paymentDetails.securityId,
                securityName: input.paymentDetails.securityName,
                tickerSymbol: input.paymentDetails.tickerSymbol,
                units: input.paymentDetails.units,
                value: input.paymentDetails.value,
                paymentNumber: input.paymentDetails.paymentNumber
            }
        };

        const scheduledDate =
            (!!input.oneTimeGrantTiming && !!input.oneTimeGrantTiming.payBy) ||
            !!input.recurringTiming
                ? determineIfFutureGrant(input)
                : null;

        // Create Fund Transaction Record
        const fundTransaction = await dbTransaction.save(
            dbTransaction.create(FundTransaction, {
                createdOn: new Date(input.date),
                chargedOn: new Date(input.date),
                fundId: fund.id,
                transactionCode,
                transactionRecurrenceId: null,
                transactionTypeId: transactionType.id,
                fundTransactionSourceId: transactionSource?.id || null,
                amount: input.amount,
                transactionStatusId: transactionStatus.id,
                userProfileId: userProfileId,
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                metadata: JSON.parse(JSON.stringify(newMetadata)),
                originalFundTransactionId: input.originalFundTransactionId,
                scheduledDate: scheduledDate ?? new Date(input.date)
            })
        );
        let cashDetail: FundTransactionDetail;
        if (input.paymentDetails.paymentType === DetailPaymentType.SECURITY) {
            const cashTransactionDetailType = await manager.findOne(TransactionDetailType, {
                name: TransactionDetailTypeName.STOCK_IN
            });

            const cashDetailObject = dbTransaction.create(FundTransactionDetail, {
                createdOn: new Date(input.date),
                fundTransactionId: fundTransaction.id,
                transactionDetailTypeId: cashTransactionDetailType.id,
                amount: !!feeAmount ? currency.subtract(input.amount, feeAmount) : input.amount,
                transactionDetailStatusId: transactionDetailStatus.id,
                fundInvestmentId: contributionCashFundInvestment.id,
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE_NONCASH].id,
                destinationAccountId: glAccounts[GLAccountTypeName.SHARED_STOCK].id
            });

            cashDetail = await dbTransaction.save(cashDetailObject);
        } else {
            const cashTransactionDetailType = await manager.findOne(TransactionDetailType, {
                name: TransactionDetailTypeName.CASH_IN
            });
            // Create Fund Transaction Detail record for cash amount
            cashDetail = await dbTransaction.save(
                dbTransaction.create(FundTransactionDetail, {
                    createdOn: new Date(input.date),
                    fundTransactionId: fundTransaction.id,
                    transactionDetailTypeId: cashTransactionDetailType.id,
                    amount: !!feeAmount ? currency.subtract(input.amount, feeAmount) : input.amount,
                    transactionDetailStatusId: transactionDetailStatus.id,
                    fundInvestmentId: contributionCashFundInvestment.id,
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                    destinationAccountId: glAccounts[GLAccountTypeName.PRIMARY].id
                })
            );
        }

        // Send email(s)
        if (process.env.NODE_ENV !== 'development') {
            const emailService = context?.email || new EmailService();
            await emailService.sendFundContributionCreatedEmails(dbTransaction, fundTransaction.id);
        }

        return { fundTransaction, cashDetail };
    });

    return results.cashDetail;
};

// Create contribution from external source (e.g. iDonate)
export async function createExternalContribution(
    fund: Fund,
    userProfile: UserProfile,
    amount: number,
    feeAmount: number,
    paymentType?: string, // comes from idonate
    paymentTransactionId?: string // comes from idonate
): Promise<FundTransaction> {
    const connection = await getOrCreateConnection();
    const fundTransactionRepo = connection.getRepository(FundTransaction);
    const detailRepo = connection.getCustomRepository(FundTransactionDetailRepository);
    const fundInvestmentRepo = connection.getCustomRepository(FundInvestmentRepository);
    const transactionType = await connection
        .getRepository(TransactionType)
        .findOne({ name: TransactionTypeValue.CONTRIBUTION });
    const detailType = await connection
        .getRepository(TransactionDetailType)
        .findOne({ name: TransactionDetailTypeName.CASH_IN });
    const feeType = await connection
        .getRepository(TransactionDetailType)
        .findOne({ name: TransactionDetailTypeName.FEE });

    const transactionStatuses = await getTransactionStatuses(connection.manager);
    const transactionDetailStatuses = await getTransactionDetailStatuses(connection.manager);
    const contributionCashFundInvestment = await fundInvestmentRepo.getContributionCashInvestmentForFund(
        fund.id
    );
    const transactionCode = await getTransactionCode(transactionType, connection.manager);
    const totalAmount = currency.add(amount, feeAmount);

    const paymentDetailType =
        paymentType === 'credit' ? DetailPaymentType.CREDIT : DetailPaymentType.ACH;
    const metadata: TransactionMetadata = paymentTransactionId
        ? {
              externalInfo: { paymentTransactionId },
              paymentDetails: { paymentType: paymentDetailType }
          }
        : {
              paymentDetails: { paymentType: paymentDetailType }
          };

    // create contribution record
    const transaction = await fundTransactionRepo.save(
        fundTransactionRepo.create({
            amount: totalAmount,
            transactionStatusId: transactionStatuses[TransactionStatusValue.PENDING],
            transactionTypeId: transactionType.id,
            fundId: fund.id,
            transactionCode: transactionCode,
            userProfileId: userProfile.id,
            createdBy: userProfile.id,
            updatedBy: userProfile.id,
            scheduledDate: new Date(),
            chargedOn: new Date(),
            metadata
        })
    );
    const glAccounts = await accountingUtil.getGLAccountsByType(connection.manager);

    // create cash-in detail record
    const detailObject = detailRepo.create({
        fundTransactionId: transaction.id,
        transactionDetailStatusId:
            transactionDetailStatuses[TransactionDetailStatusValue.PENDING_RECONCILIATION],
        transactionDetailTypeId: detailType.id,
        amount: amount,
        sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
        destinationAccountId: glAccounts[GLAccountTypeName.PRIMARY].id,
        fundInvestmentId: contributionCashFundInvestment.id,
        createdBy: userProfile.id
    });
    await detailRepo.save(detailObject);

    // We need to do not create the fee transactions for iDonate contributions
    if (feeAmount > 0 && !paymentTransactionId) {
        await detailRepo.save(
            detailRepo.create({
                fundTransactionId: transaction.id,
                transactionDetailStatusId:
                    transactionDetailStatuses[TransactionDetailStatusValue.PENDING_RECONCILIATION],
                transactionDetailTypeId: feeType.id,
                amount: feeAmount,
                sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                destinationAccountId: glAccounts[GLAccountTypeName.CREDIT_CARD_FEES].id,
                createdBy: userProfile.id
            })
        );
    }

    largeIdentify(connection.manager, userProfile.id);
    trackSingleContributionCreated(
        userProfile.id,
        fund.name,
        fund.fundCode,
        null,
        ContributionTypes.ONE_TIME,
        amount
    );

    return transaction;
}

// Create contribution to match data from an orphaned source.
export async function createContributionFromOrphanedSource(
    fundId: string,
    fundTransactionSourceId: string,
    amount: number,
    feeAmount: number,
    date: string,
    paymentType?: string
): Promise<FundTransaction> {
    const connection = await getOrCreateConnection();
    const fundTransactionRepo = connection.getRepository(FundTransaction);
    const fundTransactionSourceRepo = connection.getRepository(FundTransactionSource);
    const detailRepo = connection.getCustomRepository(FundTransactionDetailRepository);
    const fundInvestmentRepo = connection.getCustomRepository(FundInvestmentRepository);
    const fundRepo = connection.getRepository(Fund);
    const transactionType = await connection
        .getRepository(TransactionType)
        .findOne({ name: TransactionTypeValue.CONTRIBUTION });
    const detailType = await connection
        .getRepository(TransactionDetailType)
        .findOne({ name: TransactionDetailTypeName.CASH_IN });
    const feeType = await connection
        .getRepository(TransactionDetailType)
        .findOne({ name: TransactionDetailTypeName.FEE });

    // if the source doesn't check out...
    const fundTransactionSource = await fundTransactionSourceRepo.findOneOrFail(
        fundTransactionSourceId,
        { relations: ['userProfileAccount'] }
    );
    if (!fundTransactionSource) {
        throw new Error(
            `no transaction source matches the passed in ID ${fundTransactionSourceId}`
        );
    }

    //don't proceed if there's already a fundTransaction associated
    const existingFT = await fundTransactionRepo.count({ fundTransactionSourceId });
    if (existingFT !== 0) {
        throw new Error(
            `fund transaction already exists for the source ${fundTransactionSourceId}`
        );
    }

    //don't proceed if the fund id doesn't return a fund
    const fund = await fundRepo.count({ id: fundId });
    if (fund !== 1) {
        throw new Error(`No fund with id ${fundId}`);
    }

    const transactionStatuses = await getTransactionStatuses(connection.manager);
    const transactionDetailStatuses = await getTransactionDetailStatuses(connection.manager);
    const contributionCashFundInvestment = await fundInvestmentRepo.getContributionCashInvestmentForFund(
        fundId
    );
    const transactionCode = await getTransactionCode(transactionType, connection.manager);

    const paymentDetailType =
        paymentType === 'credit' ? DetailPaymentType.CREDIT : DetailPaymentType.ACH;
    const metadata: TransactionMetadata = {
        paymentDetails: { paymentType: paymentDetailType }
    };

    const totalAmount = currency.add(amount, feeAmount);

    const transaction = await fundTransactionRepo.save(
        fundTransactionRepo.create({
            amount: totalAmount,
            transactionStatusId: transactionStatuses[TransactionStatusValue.PENDING],
            transactionTypeId: transactionType.id,
            fundId,
            transactionCode: transactionCode,
            userProfileId: fundTransactionSource.userProfileAccount.userProfileId,
            createdOn: date,
            createdBy: fundTransactionSource.userProfileAccount.userProfileId,
            updatedBy: fundTransactionSource.userProfileAccount.userProfileId,
            metadata,
            fundTransactionSourceId,
            chargedOn: date
        })
    );
    const glAccounts = await accountingUtil.getGLAccountsByType(connection.manager);

    const detailObject = detailRepo.create({
        fundTransactionId: transaction.id,
        transactionDetailStatusId:
            transactionDetailStatuses[TransactionDetailStatusValue.PENDING_RECONCILIATION],
        transactionDetailTypeId: detailType.id,
        amount: amount,
        sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
        destinationAccountId: glAccounts[GLAccountTypeName.PRIMARY].id,
        fundInvestmentId: contributionCashFundInvestment.id,
        createdBy: fundTransactionSource.userProfileAccount.userProfileId,
        createdOn: date
    });
    await detailRepo.save(detailObject);

    if (feeAmount > 0) {
        await detailRepo.save(
            detailRepo.create({
                fundTransactionId: transaction.id,
                transactionDetailStatusId:
                    transactionDetailStatuses[TransactionDetailStatusValue.PENDING_RECONCILIATION],
                transactionDetailTypeId: feeType.id,
                amount: feeAmount,
                sourceAccountId: glAccounts[GLAccountTypeName.CONTRIBUTION_REVENUE].id,
                destinationAccountId: glAccounts[GLAccountTypeName.CREDIT_CARD_FEES].id,
                createdBy: fundTransactionSource.userProfileAccount.userProfileId,
                createdOn: date
            })
        );
    }

    await fundTransactionSourceRepo.save({
        id: fundTransactionSourceId,
        status: FundTransactionSourceStatusValue.POSTED
    });

    console.log(`FundTransaction created! ${transaction.id}`);

    return transaction;
}

export const createContributionFromSeries = async (
    seriesCode: string,
    entityManager?: EntityManager
): Promise<FundTransaction> => {
    // establish connection
    let manager: EntityManager = entityManager;
    if (!manager) {
        const connection = await getOrCreateConnection();
        manager = connection.manager;
    }

    const series = await manager.findOne(FundTransaction, {
        transactionCode: seriesCode
    });
    if (!series) throw new Error(`unable to find series record for ${seriesCode}`);

    // fetch data to create contribution
    const [fundTransactionRecurrenceRef, contributionType] = await Promise.all([
        manager.findOne(TransactionRecurrence, {
            id: series.transactionRecurrenceId
        }),
        manager.findOne(TransactionType, { name: TransactionTypeValue.CONTRIBUTION })
    ]);

    let userProfileAccount: UserProfileAccount;
    userProfileAccount = await manager.findOne(UserProfileAccount, {
        id: series.userProfileAccountId
    });

    if (!userProfileAccount) {
        const [fundTransactionSourceRef, userProfileAccountByProfileId] = await Promise.all([
            manager.findOne(FundTransactionSource, {
                id: series.fundTransactionSourceId
            }),
            manager.findOne(UserProfileAccount, {
                userProfileId: series.userProfileId
            })
        ]);
        if (fundTransactionSourceRef) {
            userProfileAccount = await manager.findOne(UserProfileAccount, {
                id: fundTransactionSourceRef.userProfileAccountId
            });
        } else if (userProfileAccountByProfileId) {
            userProfileAccount = userProfileAccountByProfileId;
        } else {
            throw new Error(`unable to find user profile account ${seriesCode}`);
        }
    }

    // transforms reference info input input format for mutation
    const recurrenceInput = transformRecurrenceRecIntoContributeToFundInput(
        fundTransactionRecurrenceRef,
        {
            parentRecurrenceId: fundTransactionRecurrenceRef.id,
            scheduledDate: new Date()
        }
    );

    return createContribution(
        manager,
        // use created id for user profile
        series.createdBy,
        userProfileAccount.id,
        contributionType.id,
        recurrenceInput
    );
};
