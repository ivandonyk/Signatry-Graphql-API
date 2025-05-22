import { EntityManager } from 'typeorm';
import { getOrCreateConnection } from '../typeorm';

import {
    FundTransaction,
    TransactionStatus,
    TransactionType,
    Fund,
    FundTransactionSource,
    TransactionDetailType,
    FundTransactionDetail,
    TransactionDetailStatus,
    UserProfile
} from '../models';

import { getTransactionCode } from './getTransactionCode';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { CreateManualTransactionInput } from '../inputs/FundTransaction/CreateManualTransactionInput';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionTypeValue } from '../models/TransactionType';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { ManualTransactionsInput } from '../inputs/Batch/ManualTransactionsInput';
import { createContributionForManualBatch } from './createContribution';
import { GLAccountRepository } from '../repositories/GLAccount';
import { GLAccountTypeName } from '../models/GLAccountType';
import { addUserToFund } from './addUserToFund';

export const determineDetailTypeBasedOnTransactionType = (transactionType: string) => {
    switch (transactionType) {
        case TransactionTypeValue.ADVISOR_FEE:
            return TransactionDetailTypeName.ADVISOR_FEE;
        case TransactionTypeValue.BANK_FEE:
            return TransactionDetailTypeName.BANK_FEE;
        case TransactionTypeValue.PROCESSING_FEE:
            return TransactionDetailTypeName.PROCESSING_FEE;
        case TransactionTypeValue.DIVIDEND:
            return TransactionDetailTypeName.DIVIDEND;
        case TransactionTypeValue.INTEREST:
            return TransactionDetailTypeName.INTEREST;
        case TransactionTypeValue.BUY:
            return TransactionDetailTypeName.BUY;
        case TransactionTypeValue.SELL:
            return TransactionDetailTypeName.SELL;

        // currently don't show Rebalance in dropdown list https://spiremedia-jira.atlassian.net/browse/TS-1544
        case TransactionTypeValue.REBALANCE:
            return TransactionDetailTypeName.TRANSFER;
    }
};

export const createManualTransactionRecord = async (
    manager: EntityManager,
    userProfileId: string,
    input: CreateManualTransactionInput
): Promise<FundTransaction> => {
    // get TransactionType, TransactionStatus, and Fund if not defined
    const transactionType =
        input.transactionTypeModel ||
        (await manager.findOne(TransactionType, {
            name: input.transactionType as TransactionTypeValue
        }));

    const transactionStatus =
        input.transactionStatus ||
        (await manager.findOne(TransactionStatus, {
            name: TransactionStatusValue.PENDING
        }));

    const fund =
        input.fund ||
        (await manager.findOne(Fund, {
            where: { id: input.fundId },
            relations: ['userProfiles']
        }));

    // get sequence
    const transactionCode = await getTransactionCode(transactionType, manager);

    // Run DB calls in a transaction in case Plaid or Stripe API calls fail
    const results = await manager.transaction(async dbTransaction => {
        let transactionSource: FundTransactionSource;
        // parse into JSON object and assigning them to the metadata column for the transaction records being created
        const newMetadata = {
            paymentDetails: {
                paymentType: input.paymentDetails.paymentType,
                securityId: input.paymentDetails.securityId,
                securityName: input.paymentDetails.securityName,
                tickerSymbol: input.paymentDetails.tickerSymbol,
                units: input.paymentDetails.units,
                value: input.paymentDetails.value,
                paymentNumber: input.paymentDetails.paymentNumber,
                fees: input.paymentDetails.fees
            }
        };

        // Create Fund Transaction Record
        const fundTransaction = await dbTransaction.save(
            dbTransaction.create(FundTransaction, {
                createdOn: new Date(input.date),
                fundId: fund.id,
                transactionCode,
                transactionRecurrenceId: null,
                transactionTypeId: transactionType.id,
                fundTransactionSourceId: transactionSource?.id || null,
                amount: input.amount,
                transactionStatusId: transactionStatus.id,
                userProfileId: userProfileId,
                createdBy: userProfileId,
                updatedBy: userProfileId,
                originalFundTransactionId: null,
                scheduledDate: null,
                transactionDateTime: input.transactionDateTime || new Date(),
                metadata: JSON.parse(JSON.stringify(newMetadata))
            })
        );

        return fundTransaction;
    });

    return results;
};

export const createManualTransaction = async (
    manager: EntityManager,
    userProfileId: string,
    sourceAccount: string | null,
    destinationAccount: string | null,
    input: CreateManualTransactionInput
): Promise<FundTransactionDetail> => {
    // Get Transaction Status
    const transactionDetailStatus = await manager.findOne(TransactionDetailStatus, {
        name: TransactionDetailStatusValue.PENDING
    });

    // Get Detail Type
    const transactionDetailType = await manager.findOne(TransactionDetailType, {
        name:
            input.transactionDetailType ||
            determineDetailTypeBasedOnTransactionType(input.transactionType)
    });

    // Run DB calls in a transaction in case Plaid or Stripe API calls fail
    const results = await manager.transaction(async dbTransaction => {
        // Create Fund Transaction Record
        const fundTransaction = await createManualTransactionRecord(manager, userProfileId, input);
        let ftd: FundTransactionDetail;
        const glAccountRepo = manager.getCustomRepository(GLAccountRepository);

        const sharedStockAccount = await glAccountRepo.getByType(GLAccountTypeName.SHARED_STOCK);

        if (transactionDetailType.name === TransactionDetailTypeName.BUY) {
            ftd = await dbTransaction.save(
                dbTransaction.create(FundTransactionDetail, {
                    createdOn: new Date(input.date),
                    fundTransactionId: fundTransaction.id,
                    transactionDetailTypeId: transactionDetailType.id,
                    amount: input.amount,
                    transactionDetailStatusId: transactionDetailStatus.id,
                    createdBy: userProfileId,
                    updatedBy: userProfileId,
                    description: input.description,
                    sourceAccountId: null,
                    destinationAccountId: null
                })
            );
        } else if (transactionDetailType.name === TransactionDetailTypeName.SELL) {
            ftd = await dbTransaction.save(
                dbTransaction.create(FundTransactionDetail, {
                    createdOn: new Date(input.date),
                    fundTransactionId: fundTransaction.id,
                    transactionDetailTypeId: transactionDetailType.id,
                    amount: input.amount,
                    transactionDetailStatusId: transactionDetailStatus.id,
                    createdBy: userProfileId,
                    updatedBy: userProfileId,
                    description: input.description,
                    sourceAccountId: sharedStockAccount.id,
                    destinationAccountId: null
                })
            );
        } else {
            ftd = await dbTransaction.save(
                dbTransaction.create(FundTransactionDetail, {
                    createdOn: new Date(input.date),
                    fundTransactionId: fundTransaction.id,
                    transactionDetailTypeId: transactionDetailType.id,
                    amount: input.amount,
                    transactionDetailStatusId: transactionDetailStatus.id,
                    createdBy: userProfileId,
                    updatedBy: userProfileId,
                    description: input.description,
                    sourceAccountId: sourceAccount,
                    destinationAccountId: destinationAccount
                })
            );
        }

        return ftd;
    });

    return results;
};

export const mapNewTransactionsAndGenerateRecords = async (
    manager: EntityManager,
    userProfileId: string,
    manualTransactions: ManualTransactionsInput[],
    sourceAccount: string | null,
    destinationAccount: string | null
): Promise<FundTransactionDetail[]> => {
    return await Promise.all(
        manualTransactions.map(async mt => {
            let amount = Number(mt.amount);
            if (mt.transactionType === TransactionTypeValue.SELL) {
                amount = Math.abs(amount);
            }
            const profileForTransaction = await manager.findOne(UserProfile, {
                id: mt.donorId
            });
            const fundForTransaction = await manager.findOne(Fund, {
                id: mt.fundId
            });

            if (profileForTransaction) {
                addUserToFund(profileForTransaction, fundForTransaction, manager.connection);
            }

            if (mt.transactionType === TransactionTypeValue.CONTRIBUTION) {
                const userProfileId = mt.donorId;

                const transactionType = await manager.findOne(TransactionType, {
                    name: mt.transactionType
                });

                return await createContributionForManualBatch(
                    manager,
                    userProfileId,
                    transactionType,
                    sourceAccount,
                    destinationAccount,
                    {
                        date: mt.date,
                        fundId: mt.fundId,
                        userProfileAccountId: null,
                        contributeOnBehalfOfDonorUserProfileId: userProfileId,
                        amount: amount,
                        recurringTiming: null,
                        oneTimeGrantTiming: null,
                        originalFundTransactionId: null,
                        paymentDetails: {
                            paymentType: mt.paymentType,
                            paymentNumber: mt.paymentNumber,
                            securityId: mt.securityId,
                            securityName: mt.securityName,
                            tickerSymbol: mt.tickerSymbol,
                            value: mt.value,
                            units: mt.quantity
                        }
                    }
                );
            } else if (
                [
                    TransactionTypeValue.DIVIDEND,
                    TransactionTypeValue.ADVISOR_FEE,
                    TransactionTypeValue.INTEREST,
                    TransactionTypeValue.PROCESSING_FEE,
                    TransactionTypeValue.BANK_FEE,
                    TransactionTypeValue.BUY,
                    TransactionTypeValue.SELL,
                    // currently don't show rebalance in FE https://spiremedia-jira.atlassian.net/browse/TS-1544
                    TransactionTypeValue.REBALANCE
                ].includes(mt.transactionType as TransactionTypeValue)
            ) {
                return await createManualTransaction(
                    manager,
                    userProfileId,
                    sourceAccount,
                    destinationAccount,
                    {
                        date: mt.date,
                        fundId: mt.fundId,
                        transactionType: mt.transactionType,
                        amount: amount,
                        paymentDetails: {
                            paymentType: mt.paymentType,
                            paymentNumber: mt.paymentNumber,
                            securityId: mt.securityId,
                            securityName: mt.securityName,
                            tickerSymbol: mt.tickerSymbol,
                            value: mt.value,
                            units: mt.quantity,
                            fees: mt.fees
                        }
                    }
                );
            }
        })
    );
};
