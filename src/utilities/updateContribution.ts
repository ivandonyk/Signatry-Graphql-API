import _ from 'lodash';
import Stripe from 'stripe';
import { EntityManager, In, UpdateResult } from 'typeorm';

import { CreateFundContributionInput } from '../inputs/FundTransaction/CreateFundContributionInput';
import {
    Fund,
    FundInvestment,
    FundTransaction,
    FundTransactionSource,
    TransactionEvent,
    TransactionStatus,
    UserProfile,
    UserProfileAccount
} from '../models';
import { FundTransactionSourceStatusValue } from '../models/FundTransactionSource';
import { EventNameValue } from '../models/TransactionEvent';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { UserProfileAccountTypes } from '../models/UserProfileAccount';
import { plaidClient } from '../plaid';
import { getStripeClient } from '../stripe';
import { currency } from '../utilities/currency';
import { getOrCreateStripeCustomer } from '../utilities/getOrCreateStripeCustomer';
import RecurringContributionError from '../errors/RecurringContribution';

export const updateContribution = async (
    manager: EntityManager,
    userProfileId: string,
    input: CreateFundContributionInput,
    fundTxId: string
): Promise<any> => {
    console.log(`*** BEGINNING UPDATE FOR TRANSACTION ${fundTxId}`);
    const stripeClient = getStripeClient();
    let stripeSource: Stripe.CustomerSource;
    let stripeCharge: Stripe.Charge;

    const [pendingTransactionStatus, userProfile, fund, fundInvestments] = await Promise.all([
        manager.findOne(TransactionStatus, {
            name: TransactionStatusValue.PENDING
        }),
        manager.findOne(UserProfile, {
            id: userProfileId
        }),
        manager.findOne(Fund, {
            where: { id: input.fundId },
            relations: ['userProfiles']
        }),
        manager.find(FundInvestment, {
            fundId: input.fundId
        })

    ]);

    const metaData = {
        'donorName':userProfile.fullName,
        'fundKey':fund.fundKey,
    }

    // Validate percentages
    if (_.sumBy(fundInvestments, a => a.allocationPercentage * 100) / 100 !== 1)
        throw Error('Investment pool allocation percentages do not sum to 1.0');

    // Run DB calls in a transaction in case Plaid or Stripe API calls fail
    await manager.transaction(async dbTransaction => {
        let feeAmount: number;
        let ftSource: FundTransactionSource;

        if (!!input.userProfileAccountId) {
            const userProfileAccount = await manager.findOne(UserProfileAccount, {
                id: input.userProfileAccountId
            });

            // Check to see if profile is a current STRIPE Customer
            let stripeCustomer: Stripe.Customer;
            try {
                stripeCustomer = await getOrCreateStripeCustomer(
                    userProfile,
                    stripeClient,
                    dbTransaction,
                    `${pendingTransactionStatus.name} :: ${fund.fundCode}`
                );
            } catch (e) {
                throw new RecurringContributionError(
                    `updateContribution(ftId ${fundTxId}): cannot get or create stripe customer: ${e.message}`
                );
            }

            console.log(`*** STRIPE CUSTOMER SUCCESSFULLY LOADED ${stripeCustomer.id}`);

            // May need to update Profile with the new Stripe Customer
            if (userProfile.customerId !== stripeCustomer.id) {
                console.log('*** CHANGING CUSTOMER ID');
                userProfile.customerId = stripeCustomer.id;
                await dbTransaction.save(userProfile);
            }

            // If Contribution is with a BANK_ACCOUNT, the Stripe Customer may not yet exist
            if (userProfileAccount.accountType === UserProfileAccountTypes.BANK_ACCOUNT) {
                // Find stripe source matching Plaid account info
                const sources = (stripeCustomer.sources
                    ? stripeCustomer.sources.data
                    : []) as Stripe.Source[];
                stripeSource = sources.find(
                    source =>
                        source.metadata.plaidItemId === userProfileAccount.itemId &&
                        source.metadata.plaidAccountId === userProfileAccount.accountId
                ) as Stripe.Source;

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
                        throw new RecurringContributionError(
                            `updateContribution(ftId ${fundTxId}): cannot create stripe token: ${e.message}`
                        );
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
                        throw new RecurringContributionError(
                            `updateContribution(ftId ${fundTxId}): cannot create bank stripe source: ${e.message}`
                        );
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
                    throw new RecurringContributionError(
                        `updateContribution(ftId ${fundTxId}): Cannot create new bank stripe charge: ${e.message}`
                    );
                }

                console.log(`*** STRIPE CHARGE CREATED ${stripeCharge.id}`);
            }

            // If the contribution is with a credit card, a Stripe Customer will already exist; create the charge
            else if (userProfileAccount.accountType === UserProfileAccountTypes.CREDIT_CARD) {
                try {
                    stripeCharge = await stripeClient.charges.create({
                        amount: input.amount * 100,
                        currency: 'usd',
                        customer: stripeCustomer.id,
                        source: userProfileAccount.paymentMethodId,
                        metadata: metaData,
                    });
                } catch (e) {
                    throw new RecurringContributionError(
                        `updateContribution(ftId ${fundTxId}): Cannot create new card stripe charge: ${e.message}`
                    );
                }
            }

            // Get STRIPE fee data
            let stripeBalanceTransaction: Stripe.Response<Stripe.BalanceTransaction>;
            try {
                stripeBalanceTransaction = await stripeClient.balanceTransactions.retrieve(
                    stripeCharge.balance_transaction as string
                );
            } catch (e) {
                throw new RecurringContributionError(
                    `updateContribution(ftId ${fundTxId}): Cannot retrieve balance transaction: ${e.message}`
                );
            }

            const feeAmountInCents = stripeBalanceTransaction.fee_details.reduce(
                (sum: number, value: { amount: number }) => {
                    return currency.add(sum, value.amount);
                },
                0
            );

            feeAmount = currency.divide(feeAmountInCents, 100);

            // Create Fund Transaction Source Record
            ftSource = await dbTransaction.save(
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

            console.log(`*** FT SOURCE CREATED WITH ID ${ftSource.id}`);

            // update contribution status to PENDING
            await dbTransaction.update(FundTransaction, fundTxId, {
                transactionStatusId: pendingTransactionStatus.id,
                fundTransactionSourceId: ftSource.id
            });
        } // end input.userProfileAccountId boolean

        // create event
        await dbTransaction.save(
            dbTransaction.create(TransactionEvent, {
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                userProfileId: userProfile.id,
                fundTransactionId: fundTxId,
                name: EventNameValue.CREATED
            })
        );
    }); // end transaction
};
