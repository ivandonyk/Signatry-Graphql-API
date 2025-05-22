import { EntityManager } from 'typeorm';
import {
    FundTransaction,
    FundTransactionDetail,
    GLAccountReconciliation,
    Holding,
    InstitutionAccountTransaction
} from '../models';
import { BatchStatusValue } from '../models/Batch';
import { currency } from './currency';

import { TransferMetadata } from '../models/FundTransactionMetadata';
import { TransactionTypeValue } from '../models/TransactionType';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { InstitutionAccountTransactionType } from '../models/InstitutionAccountTransaction';
import { Investment, InvestmentType } from '../models/Investment';
import {
    sendContributionPostedEmails,
    sendConfirmationStockGiftReceivedEmails
} from '../events/emailUtils';

import {
    calculateCostBasisForPurchase,
    calculateRealizedGainForSale
} from './calculateHoldingCostAndGains';
import {
    getTransactionStatuses,
    getTransactionDetailStatuses
} from './getTransactionStatuses';
import { createTransfer, TransferType } from './transfers';
import { formatDate } from './datetime';
import { createCashTransactionDetails, isComplete, isType, totalUnitChangePerFundInvestmentReducer } from './transactionDetail';
import { poolInvestmentUtil } from './poolInvestment';
import { FundInvestmentRepository } from '../repositories/FundInvestment';
import { RequestTransactionContext } from '../context';

import { GLAccountTypeName } from '../models/GLAccountType';
import { accountingUtil } from '../utilities/accounting';
import { getInvestmentUnitPrices } from '../utilities/funds';
import { holdingUtil } from '../utilities/holding';
import { institutionAccountTransactionUtil } from '../utilities/institutionAccountTransaction';

type PayableReceivableChanges = {
    [fundInvestmentId: string]: { payable: number, receivable: number }
}

// Determines whether transaction is going in or out of account
function getTransactionAmount(transferDetail: FundTransactionDetail, glAccountId: string): number {
    if (transferDetail.sourceAccountId === glAccountId) {
        return Math.abs(transferDetail.amount) * -1;
    } else if (transferDetail.destinationAccountId === glAccountId) {
        return Math.abs(transferDetail.amount);
    }
    return transferDetail.amount;
}

// Assigns the relevant fund investment ID to each transaction
async function processTransactionDetails(
    manager: EntityManager,
    details: FundTransactionDetail[],
    glAccountId: string
): Promise<FundTransactionDetail[]> {
    // Assign correct fundInvestmentId and amount to internal transfer
    return await Promise.all(
        details.map(async detail => {
            // Determine fund investment for current account being reconciled
            const fundInvestment = await manager
                .getCustomRepository(FundInvestmentRepository)
                .getFundInvestmentForFundByGLAccount(
                    detail.fundTransaction.fundId,
                    glAccountId
                );
            const amount = getTransactionAmount(detail, glAccountId);
            detail.fundInvestmentId = fundInvestment.id;
            detail.amount = amount;
            return detail;
        })
    );
}

async function totalPayableReceivableChanges(
    manager: EntityManager,
    details: FundTransactionDetail[],
    glAccountId: string
): Promise<PayableReceivableChanges> {
    const changesByFundInvestment: PayableReceivableChanges = {};
    if (process.env.ENABLE_PAYABLE_RECEIVABLE !== 'true') {
        return changesByFundInvestment;
    }
    const fundInvestmentRepo = manager
        .getCustomRepository(FundInvestmentRepository);
    for (const detail of details) {
        const batchIsPosted = detail.batch.status === BatchStatusValue.POSTED;
        const [destinationFundInvestment, sourceFundInvestment] = await Promise.all([
            fundInvestmentRepo.getFundInvestmentForFundByGLAccount(
                detail.fundTransaction.fundId,
                detail.destinationAccountId
            ),
            fundInvestmentRepo.getFundInvestmentForFundByGLAccount(
                detail.fundTransaction.fundId,
                detail.sourceAccountId
            )
        ]);
        let fiId: string;
        const changes = { payable: 0, receivable: 0 };
        const sourceInvestmentType = sourceFundInvestment?.investment?.investmentType;
        const destinationInvestmentType = destinationFundInvestment?.investment?.investmentType;
        if (detail.sourceAccountId === glAccountId) {
            if (batchIsPosted && destinationFundInvestment && sourceInvestmentType !== InvestmentType.IMA) {
                // If batch is posted, relieve payable amount on source
                fiId = sourceFundInvestment.id;
                changes.payable = Math.abs(detail.amount) * -1;
            } else if (!batchIsPosted && destinationFundInvestment && destinationInvestmentType !== InvestmentType.IMA) {
                // If batch is not posted, add to receivable amount on destination
                fiId = destinationFundInvestment.id;
                changes.receivable = Math.abs(detail.amount);
            }
        } else if (detail.destinationAccountId === glAccountId) {
            if (batchIsPosted && sourceFundInvestment && destinationInvestmentType !== InvestmentType.IMA) {
                // If batch is posted, relieve receivable amount on destination
                fiId = destinationFundInvestment.id;
                changes.receivable = Math.abs(detail.amount) * -1;
            } else if (!batchIsPosted && sourceFundInvestment && sourceInvestmentType !== InvestmentType.IMA) {
                // If batch is not posted, add to payable amount on source
                fiId = sourceFundInvestment.id;
                changes.payable = Math.abs(detail.amount);
            }
        }
        if (fiId) {
            if (!changesByFundInvestment.hasOwnProperty(fiId)) {
                changesByFundInvestment[fiId] = {
                    payable: 0,
                    receivable: 0
                };
            }
            const currentPayable = changesByFundInvestment[fiId].payable;
            const currentReceivable = changesByFundInvestment[fiId].receivable;
            changesByFundInvestment[fiId].payable = currency.add(currentPayable, changes.payable, 14);
            changesByFundInvestment[fiId].receivable = currency.add(currentReceivable, changes.receivable, 14);
        }
    }
    return changesByFundInvestment;
}

// Adds up total change to each fund's cash holding
function totalCashChangePerFundInvestment(
    details: FundTransactionDetail[]
): { [fundid: string]: number } {
    const changesByFundInvestment = {};
    for (const detail of details) {
        const fundInvestmentId = detail.fundInvestmentId;
        if (!changesByFundInvestment.hasOwnProperty(fundInvestmentId)) {
            changesByFundInvestment[fundInvestmentId] = 0;
        }
        const newValue = currency.add(
            changesByFundInvestment[fundInvestmentId],
            detail.amount,
            14
        );

        changesByFundInvestment[fundInvestmentId] = newValue;
    }
    return changesByFundInvestment;
}

function totalSecurityChangePerFundReducer(
    changesByFund: {
        [fundid: string]: {
            [securityid: string]: {
                change: number;
                value: number;
                units: number;
            };
        };
    },
    detail: FundTransactionDetail
): {
    [fundid: string]: {
        [securityid: string]: {
            change: number;
            value: number;
            units: number;
        };
    };
} {
    const fundId = detail.fundTransaction.fundId;
    const metadata = detail.fundTransaction.metadata;
    const paymentDetails = metadata.paymentDetails;
    const securityId = metadata.paymentDetails.securityId;

    if (!changesByFund.hasOwnProperty(fundId)) {
        changesByFund[fundId] = {};
    }
    if (!changesByFund[fundId].hasOwnProperty(securityId)) {
        changesByFund[fundId][securityId] = {
            change: 0,
            value: 0,
            units: 0
        };
    }
    const newTotalChange = currency.add(
        changesByFund[fundId][securityId].change,
        Math.abs(detail.amount),
        14
    );
    const newTotalUnits = currency.add(
        changesByFund[fundId][securityId].units,
        Number(paymentDetails.units),
        14
    );

    const newTotalValue = currency.divide(newTotalChange, newTotalUnits, 14);

    changesByFund[fundId][securityId].change = newTotalChange;
    changesByFund[fundId][securityId].value = newTotalValue; // utiltiy to average the units and change, divide total change by total units averagePriceCalculator, new total divide by
    changesByFund[fundId][securityId].units = newTotalUnits;

    return changesByFund;
}

export async function processReconciledTransactions(
    context: RequestTransactionContext,
    reconciliationId: string,
    transactions: InstitutionAccountTransaction[]
) {
    await context.joinTransaction('processReconciledTransactions', async (manager, tranContext) => {
        const reconciliationRepo = manager.getRepository(GLAccountReconciliation);
        const holdingRepo = manager.getRepository(Holding);
        const transactionRepo = manager.getRepository(InstitutionAccountTransaction);
        const fundInvestmentRepo = manager.getCustomRepository(FundInvestmentRepository);
        const transactionStatuses = await getTransactionStatuses(manager);
        const transactionDetailStatuses = await getTransactionDetailStatuses(manager);

        async function getLatestHolding(transaction: InstitutionAccountTransaction): Promise<Holding> {
            const holding = await holdingRepo
            .createQueryBuilder('holding')
            .where('holding.id = :holdingId', { holdingId: transaction.holdingId })
            .orderBy('holding.date', 'DESC')
            .getOne();
            tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - getLatestHolding Holding : ${JSON.stringify(holding)}`);
            return holding;
        }

        async function updateRealizedGainForSale(
            transaction: InstitutionAccountTransaction,
            latestHolding: Holding
        ) {
            const realizedGain = calculateRealizedGainForSale(
                transaction.units,
                transaction.unitPrice,
                latestHolding.cumulativeAverageCost
            );
            tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateRealizedGainForSale Updating Transaction with realized gain for InstitutionAccountTransaction ' ${transaction.id}, value ${realizedGain}`);
            await transactionRepo.update(transaction.id, { realizedGain: realizedGain });
        }

        async function updateCostBasisForBuy(
            transaction: InstitutionAccountTransaction,
            latestHolding: Holding
        ) {
            const costBasis = calculateCostBasisForPurchase(
                transaction.units,
                transaction.unitPrice,
                latestHolding.units,
                latestHolding.cumulativeAverageCost
            );
            tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateCostBasisForBuy Updating Transaction with cost basis for InstitutionAccountTransaction ' ${transaction.id}, value ${costBasis}`);
            await transactionRepo.update(transaction.id, { costBasis: costBasis });
        }

        async function updateDetailStatuses(
            transactionDetails: FundTransactionDetail[],
            statusName: TransactionDetailStatusValue,
            manager: EntityManager
        ) {
            if (transactionDetails.length === 0) return;
            const detailIds = transactionDetails.map(d => d.id);
            await manager
                .getRepository(FundTransactionDetail)
                .createQueryBuilder('transactionDetail')
                .update()
                .whereInIds(detailIds)
                .set({ transactionDetailStatusId: transactionDetailStatuses[statusName] })
                .execute();
            tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateDetailStatuses: Status ${statusName}, Details ${JSON.stringify(allDetails.map(detail => detail.transactionCode))}`);
        }

        async function updateTransactionStatuses(
            transactions: FundTransaction[],
            statusName: TransactionStatusValue,
            manager: EntityManager
        ) {
            if (transactions.length === 0) return;
            const transactionIds = transactions.map(t => t.id);
            await manager
                .getRepository(FundTransaction)
                .createQueryBuilder('transaction')
                .update()
                .whereInIds(transactionIds)
                .set({ transactionStatusId: transactionStatuses[statusName] })
                .execute();
            tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateTransactionStatuses: Status ${statusName}, Transactions ${JSON.stringify(transactions.map(transaction => transaction.transactionCode))}`);
        }

        async function siblingDetailsAreComplete(detail: FundTransactionDetail): Promise<boolean> {
            const siblingDetails = await manager
                .getRepository(FundTransactionDetail)
                .createQueryBuilder('transactionDetail')
                .leftJoinAndSelect(
                    'transactionDetail.transactionDetailStatus',
                    'transactionDetailStatus'
                )
                .leftJoinAndSelect('transactionDetail.transactionDetailType', 'transactionDetailType')
                .where('transactionDetail.fundTransactionId = :transactionId', {
                    transactionId: detail.fundTransactionId
                })
                .andWhere('transactionDetail.id != :detailId', { detailId: detail.id })
                .getMany();
            const result =
                siblingDetails.length > 0
                ? siblingDetails.every(isComplete)
                : true; // If there are no siblings, then transaction is complete

            tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - siblingDetailsAreComplete: Detail ${detail.transactionCode}, Result ${result}`);
            return result;
        }

        async function detailsWithCompletedSiblings(
            details: FundTransactionDetail[]
        ): Promise<FundTransactionDetail[]> {
            const results = await Promise.all(details.map(d => siblingDetailsAreComplete(d)));
            const result = details.filter((d, index) => results[index]);
            return result;
        }

        async function updateGrantStatuses(details: FundTransactionDetail[], manager: EntityManager) {
            if (details.length === 0) return;
            for (const detail of details) {
                const grantDetails = await manager
                    .getRepository(FundTransactionDetail)
                    .createQueryBuilder('transactionDetail')
                    .leftJoinAndSelect(
                        'transactionDetail.transactionDetailStatus',
                        'transactionDetailStatus'
                    )
                    .leftJoinAndSelect(
                        'transactionDetail.transactionDetailType',
                        'transactionDetailType'
                    )
                    .where('transactionDetail.fundTransactionId = :grantId', {
                        grantId: detail.fundTransactionId
                    })
                    .getMany();
                const divestmentCashDetail = grantDetails.find(
                    d =>
                    d.transactionDetailType.name === TransactionDetailTypeName.GRANT_DIVESTMENT_CASH
                );
                const divestmentsComplete = grantDetails
                    .filter(isType(TransactionDetailTypeName.DIVESTMENT))
                    .every(isComplete);
                const paymentComplete = isComplete(
                    grantDetails.find(
                        d => d.transactionDetailType.name === TransactionDetailTypeName.CASH_OUT
                    )
                );
                if (divestmentsComplete) {
                    await updateDetailStatuses(
                        [divestmentCashDetail],
                        TransactionDetailStatusValue.COMPLETE,
                        manager
                    );
                }
                if (paymentComplete) {
                    await updateTransactionStatuses(
                        [detail.fundTransaction],
                        TransactionStatusValue.COMPLETE,
                        manager
                    );
                }
            }
        }

        async function updateContributionStatuses(
            details: FundTransactionDetail[],
            manager: EntityManager
        ) {
            if (details.length === 0) return;
            const cashOrStockInDetails = details.filter(detail =>
                detail.transactionDetailType.name === TransactionDetailTypeName.CASH_IN || detail.transactionDetailType.name === TransactionDetailTypeName.STOCK_IN
            );
            const transactions = cashOrStockInDetails.map(detail => detail.fundTransaction);
            await updateTransactionStatuses(
                transactions,
                TransactionStatusValue.COMPLETE,
                manager
            );
        }

        async function updateFundTransferStatuses(
            details: FundTransactionDetail[],
            manager: EntityManager
        ) {
            if (details.length === 0) return;
            const completed = await detailsWithCompletedSiblings(details);
            if (completed.length === 0) return;
            await updateTransactionStatuses(
                completed.map(detail => detail.fundTransaction),
                TransactionStatusValue.COMPLETE,
                manager
            );
            const completedTransfers = new Set();
            // Create transfers-in for all completed transfers-out
            for (const completedDetail of completed) {
                if (completedTransfers.has(completedDetail.fundTransactionId)) return;
                if (
                    completedDetail.fundTransaction.transactionType.name ===
                    TransactionTypeValue.TRANSFER_OUT
                ) {
                    // If transaction is a transfer out, check if transfer in should be created
                    const transfer = completedDetail.fundTransaction;
                    const { metadata }: { metadata: TransferMetadata } = transfer;
                    if (
                        metadata.transferId &&
                        metadata.transactionSource?.fundDetails?.fundId &&
                        metadata.transactionDestination?.fundDetails?.fundId &&
                        /temporary/.test(metadata.transactionDestination?.id) // If this placeholder ID is present, the transfer-in has not already been created
                    ) {
                        const input = {
                            fromFundId: metadata.transactionSource.fundDetails.fundId,
                            requestDate: formatDate(transfer.scheduledDate, 'MM/DD/YY'),
                            toFundId: metadata.transactionDestination.fundDetails.fundId,
                            amount: Math.abs(transfer.amount),
                            type: TransferType.TRANSFER_IN
                        };
                        await createTransfer(
                            context,
                            transfer.userProfileId,
                            metadata.transferId,
                            input
                        );
                        // Transfer ownership of grant cash to receiving fund
                        const [
                            fundInvestmentForTransferOut,
                            fundInvestmentForTransferIn
                        ] = await Promise.all([
                            fundInvestmentRepo
                            .getFundInvestmentForFundByGLAccount(
                                transfer.fundId,
                                completedDetail.destinationAccountId
                            ),
                            fundInvestmentRepo
                            .getFundInvestmentForFundByGLAccount(
                                input.toFundId,
                                completedDetail.destinationAccountId
                            )
                        ]);
                        await Promise.all([
                            poolInvestmentUtil.updateCashHoldingByFundInvestment(
                                manager,
                                fundInvestmentForTransferOut.id,
                                Math.abs(transfer.amount) * -1
                            ),
                            poolInvestmentUtil.updateCashHoldingByFundInvestment(
                                manager,
                                fundInvestmentForTransferIn.id,
                                Math.abs(transfer.amount),
                            )
                        ]);
                    }
                }
                completedTransfers.add(completedDetail.fundTransactionId);
            }
        }

        async function updateRebalanceStatuses(
            details: FundTransactionDetail[],
            manager: EntityManager
        ) {
            if (details.length === 0) return;
            const completed = await detailsWithCompletedSiblings(details);
            if (completed.length > 0) {
                await updateTransactionStatuses(
                    completed.map(detail => detail.fundTransaction),
                    TransactionStatusValue.COMPLETE,
                    manager
                );
            }
        }

        async function updateInternalTransferStatuses(
            details: FundTransactionDetail[],
            manager: EntityManager
        ) {
            const completed = await detailsWithCompletedSiblings(details);
            if (completed.length > 0) {
                await updateTransactionStatuses(
                    completed.map(detail => detail.fundTransaction),
                    TransactionStatusValue.COMPLETE,
                    manager
                );
            }
        }

        const reconciliation = await reconciliationRepo
            .createQueryBuilder('reconciliation')
            .leftJoinAndSelect('reconciliation.glAccount', 'glAccount')
            .leftJoinAndSelect('glAccount.investment', 'investment')
            .where('reconciliation.id = :id', { id: reconciliationId })
            .getOne();
        const investmentType = reconciliation.glAccount.investment.investmentType;

        const batchIds = transactions.map(t => t.batchId);

        const transactionDetails = await manager
            .getRepository(FundTransactionDetail)
            .createQueryBuilder('transactionDetail')
            .leftJoinAndSelect('transactionDetail.transactionDetailType', 'transactionDetailType')
            .leftJoinAndSelect('transactionDetail.fundTransaction', 'fundTransaction')
            .leftJoinAndSelect('transactionDetail.batch', 'batch')
            .leftJoinAndSelect('transactionDetail.fundInvestment', 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .leftJoinAndSelect('fundTransaction.transactionType', 'transactionType')
            .where('transactionDetail.batchId IN (:...batchIds)', { batchIds: batchIds })
            .getMany();

        tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - ProcessReconciledTransactionsListener started`);

        // Calculate cost basis and gains/losses for transactions
        for (const transaction of transactions) {
            try {
                // Calculate realized gain for sell transactions based on latest cumulative cost
                const latestHolding = await getLatestHolding(transaction);
                if (latestHolding) {
                    if (transaction.transactionType === InstitutionAccountTransactionType.SELL) {
                        await updateRealizedGainForSale(transaction, latestHolding);
                    }
                    // Calculate new cost basis for buy transactions
                    if (transaction.transactionType === InstitutionAccountTransactionType.BUY) {
                        await updateCostBasisForBuy(transaction, latestHolding);
                    }
                } else {
                    tranContext.warn(
                        `ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - Error updating transaction cost basis: Unable to load holding for transaction ${transaction.transactionId}`
                    );
                }
            } catch (error) {
                tranContext.warn(
                    `ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - Error updating transaction cost basis for transaction ${transaction.transactionId}: ${error.message}`
                );
                throw error;
            }
        }

        const sortedDetails = {
            contributions: [],
            grants: [],
            fundTransfers: [],
            internalTransfers: [],
            rebalances: []
        };

        const cashInDetails = transactionDetails.filter(
            isType(TransactionDetailTypeName.CASH_IN)
        );
        const cashOutDetails = transactionDetails.filter(
            isType(TransactionDetailTypeName.CASH_OUT)
        );
        const investmentDetails = transactionDetails.filter(
            isType(TransactionDetailTypeName.INVESTMENT)
        );
        const divestmentDetails = transactionDetails.filter(
            isType(TransactionDetailTypeName.DIVESTMENT)
        );
        const transferDetails = transactionDetails.filter(
            isType(TransactionDetailTypeName.TRANSFER)
        );
        const stockInDetails = transactionDetails.filter(
            isType(TransactionDetailTypeName.STOCK_IN)
        );
        const sellDetails = transactionDetails.filter(
            isType(TransactionDetailTypeName.SELL)
        );

        let allDetails = cashInDetails
            .concat(cashOutDetails)
            .concat(investmentDetails)
            .concat(divestmentDetails)
            .concat(transferDetails);

        if (allDetails.length > 0) {
            tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - Processing transaction details ${JSON.stringify(allDetails.map(detail => detail.transactionCode))}`);
            allDetails = await processTransactionDetails(
                manager,
                allDetails,
                reconciliation.glAccountId
            );
            await updateDetailStatuses(
                allDetails,
                TransactionDetailStatusValue.COMPLETE,
                manager
            );
            // Sort details by parent type
            for (const detail of allDetails) {
                const parentType = detail.fundTransaction.transactionType.name;
                if (parentType === TransactionTypeValue.CONTRIBUTION) {
                    sortedDetails.contributions.push(detail);
                } else if (parentType === TransactionTypeValue.GRANT) {
                    sortedDetails.grants.push(detail);
                } else if (parentType === TransactionTypeValue.TRANSFER_IN) {
                    sortedDetails.fundTransfers.push(detail);
                } else if (parentType === TransactionTypeValue.TRANSFER_OUT) {
                    sortedDetails.fundTransfers.push(detail);
                } else if (parentType === TransactionTypeValue.REBALANCE) {
                    sortedDetails.rebalances.push(detail);
                } else if (parentType === TransactionTypeValue.INTERNAL_TRANSFER) {
                    sortedDetails.internalTransfers.push(detail);
                }
            }
            // Only adjust holdings for cash accounts
            // Investment account holdings handled separately
            if (investmentType !== InvestmentType.POOL) {
                const cashChangesByFundInvestment = totalCashChangePerFundInvestment(allDetails);
                const payableReceivableChangesByFundInvestment = await totalPayableReceivableChanges(
                    manager,
                    allDetails,
                    reconciliation.glAccountId
                );
                for (const fundInvestmentId in cashChangesByFundInvestment) {
                    const value = cashChangesByFundInvestment[fundInvestmentId];
                    tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateCashHoldingByFundInvestment Updating cash holding value fundInvestmentId ${fundInvestmentId}) (value ${value})`);
                    try {
                        await poolInvestmentUtil.updateCashHoldingByFundInvestment(
                            manager,
                            fundInvestmentId,
                            value, 
                            0,
                            0
                        );   
                    } catch (error) {
                        tranContext.warn(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateCashHoldingByFundInvestment Updating cash holding value failed on (fundInvestmentId ${fundInvestmentId}) (value ${value}) - Error: ${error.message}`);
                        throw error;
                    }
                }
                for (const fundInvestmentId in payableReceivableChangesByFundInvestment) {
                    const values = payableReceivableChangesByFundInvestment[fundInvestmentId];
                    tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updatePoolHoldingByFundInvestment Updating cash holding payable/receivable on (fundInvestmentId ${fundInvestmentId}) (values ${JSON.stringify(values)})`);
                    try {
                        await poolInvestmentUtil.updatePoolHoldingByFundInvestment(
                            fundInvestmentId,
                            0,
                            values.payable,
                            values.receivable,
                            manager
                        );   
                    } catch (error) {
                        tranContext.warn(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateCashHoldingByFundInvestment failed on (fundInvestmentId ${fundInvestmentId}) (values ${JSON.stringify(values)}) - Error: ${error.message}`);
                        throw error;
                    }
                }
            }

            await updateContributionStatuses(sortedDetails.contributions, manager);
            await updateGrantStatuses(sortedDetails.grants, manager);
            await updateFundTransferStatuses(sortedDetails.fundTransfers, manager);
            await updateInternalTransferStatuses(sortedDetails.internalTransfers, manager);
            await updateRebalanceStatuses(sortedDetails.rebalances, manager);

            if (cashInDetails.length > 0) {
                await createCashTransactionDetails(manager, cashInDetails.map(d => d.id));
            }
        }

        if (stockInDetails.length > 0) {
            const stockInContributions = stockInDetails.filter(detail => detail.fundTransaction.transactionType.name === TransactionTypeValue.CONTRIBUTION);
            await updateContributionStatuses(stockInContributions, manager);
        }

        // Update security and cash stock holdings if transaction is in shared stock account 
        if (investmentType === InvestmentType.SHARED_STOCK) {
            const stockContributionCashChangesPerFund = stockInDetails.reduce(
                totalSecurityChangePerFundReducer,
                {}
            );
            for (const fundId in stockContributionCashChangesPerFund) {
                const perFund = stockContributionCashChangesPerFund[fundId];
                for (const securityId in perFund) {
                    // Needs to be awaited in case transfers and subsequent sales are included in the same post
                    try {
                        tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateSharedStockHolding Updating stock holding for stock in on (fundId ${fundId} (securityId ${securityId}) (values ${JSON.stringify(perFund[securityId])})`);
                        await poolInvestmentUtil.updateSharedStockHolding(
                            manager,
                            fundId,
                            securityId,
                            perFund[securityId].units,
                            perFund[securityId].value
                        );
                    } catch (error) {
                        tranContext.warn(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateSharedStockHolding Updating stock holding for stock in failed on (fundId ${fundId} (securityId ${securityId}) (values ${JSON.stringify(perFund[securityId])}) - Error ${error.message}`);
                        throw error;
                    }
                }
            }
            for (const sell of sellDetails) {
                const transaction = sell.fundTransaction;
                const payDetails = transaction.metadata.paymentDetails;
                const securityId = payDetails.securityId;
                const fundId = transaction.fundId;
                const units = Math.abs(Number(payDetails.units));
                const value = Number(payDetails.value);
                // Reduce stock holding
                try {
                    tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateSharedStockHolding Updating stock holding for sell transaction ${sell.transactionCode}`);
                    await poolInvestmentUtil.updateSharedStockHolding(
                        manager,
                        fundId,
                        securityId,
                        -1 * units,
                        value
                    );
                } catch (error) {
                    tranContext.warn(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateSharedStockHolding Updating stock holding for sell failed for transaction ${sell.transactionCode}) - Error ${error.message}`);
                    throw error;
                }
                try {
                    tranContext.log(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateSharedStockHolding Updating cash holding for sell transaction ${sell.transactionCode}`);
                    // Increase cash holding
                    await poolInvestmentUtil.updateSharedStockHolding(
                        manager,
                        fundId,
                        'CASH',
                        sell.amount,
                        1
                    );
                } catch (error) {
                    tranContext.warn(`ProcessReconciledTransactions: Account ${reconciliation.glAccount.investment.name} - updateSharedStockHolding Updating cash holding for sell failed for transaction ${sell.transactionCode}`);
                    throw error;
                }
            }
        }

        if (cashInDetails.length > 0) {
            // send emails to fundholders on fund, as well as donor about this contribution
            sendContributionPostedEmails(cashInDetails);
        }

        if (stockInDetails.length > 0) {
            // send emails to fundholders on fund, as well as donor about stock gift received
            sendConfirmationStockGiftReceivedEmails(stockInDetails);
        }
    });
}

export async function reconciliationSubmitted(
    context: RequestTransactionContext,
    reconciliationId: string
) {
    await context.joinTransaction(
        'onReconciliationSubmitted',
        async (manager, tranContext) => {
            const reconciliationRepo = manager.getRepository(GLAccountReconciliation);
            const detailRepo = manager.getRepository(FundTransactionDetail);
            const investmentRepo = manager.getRepository(Investment);

            const reconciliation = await reconciliationRepo
                .createQueryBuilder('reconciliation')
                .leftJoinAndSelect('reconciliation.glAccount', 'glAccount')
                .leftJoinAndSelect('glAccount.investment', 'investment')
                .leftJoinAndSelect('glAccount.accountTypes', 'accountTypes')
                .leftJoinAndSelect('reconciliation.transactions', 'transactions')
                .where('reconciliation.id = :id', { id: reconciliationId })
                .getOne();
            const glAccountTypes = reconciliation.glAccount.accountTypes.map(t => t.name);
            const batchIds = reconciliation.transactions.map(t => t.batchId);
            const transactionDetails = await detailRepo
                .createQueryBuilder('transactionDetail')
                .leftJoinAndSelect(
                    'transactionDetail.transactionDetailType',
                    'transactionDetailType'
                )
                .leftJoinAndSelect(
                    'transactionDetail.transactionDetailStatus',
                    'transactionDetailStatus'
                )
                .leftJoinAndSelect('transactionDetail.fundTransaction', 'fundTransaction')
                .leftJoinAndSelect('transactionDetail.batch', 'batch')
                .leftJoinAndSelect('transactionDetail.fundInvestment', 'fundInvestment')
                .leftJoinAndSelect('fundTransaction.fund', 'fund')
                .leftJoinAndSelect('fundTransaction.userProfile', 'userProfile')
                .leftJoinAndSelect('fundInvestment.investment', 'investment')
                .leftJoinAndSelect('fundTransaction.transactionType', 'transactionType')
                .where('transactionDetail.batchId IN (:...batchIds)', { batchIds: batchIds })
                .getMany();

            async function updateUnitPrice(
                reconciliation: GLAccountReconciliation,
                manager: EntityManager
            ): Promise<number> {
                const investment = reconciliation.glAccount.investment;
                const transactionSummary = institutionAccountTransactionUtil.getTransactionSummary(
                    reconciliation.transactions
                );
                const holdingChangeSummary = await holdingUtil.getHoldingChangeSummaryForAccount(
                    reconciliation.glAccountId,
                    reconciliation.datePreviousReconciled,
                    reconciliation.dateReconciled
                );

                const allChange = holdingChangeSummary.allChange;
                const openingBalance = holdingChangeSummary.openingBalance;

                const deposits = transactionSummary.transactionSumsByType.find(
                    sum => sum.transactionType === InstitutionAccountTransactionType.DEPOSIT
                ).valueSum;
                const stockTransfers = transactionDetails.filter(
                    isType(TransactionDetailTypeName.STOCK_IN)
                );
                const totalTransferAmount = stockTransfers.reduce(
                    (sum, t) => currency.add(sum, t.amount, 14),
                    0
                );
                const totalDepositAmount = currency.add(deposits, totalTransferAmount, 14);
                const withdrawals = transactionSummary.transactionSumsByType.find(
                    sum => sum.transactionType === InstitutionAccountTransactionType.WITHDRAWAL
                ).valueSum;
                const depositsAndWithdrawals = currency.add(totalDepositAmount, withdrawals);
                const changeInInvesmentValue = currency.subtract(allChange, depositsAndWithdrawals);
                const newUnitPrice = await poolInvestmentUtil.updatePoolUnitPrice(
                    manager,
                    investment.id,
                    changeInInvesmentValue
                );

                // Capture the transaction summary used to calculate this new unit price
                const buys = transactionSummary.transactionSumsByType.find(
                    sum => sum.transactionType === InstitutionAccountTransactionType.BUY
                );
                const sells = transactionSummary.transactionSumsByType.find(
                    sum => sum.transactionType === InstitutionAccountTransactionType.SELL
                );
                const transfers = transactionSummary.transactionSumsByType.find(
                    sum => sum.transactionType === InstitutionAccountTransactionType.TRANSFER
                );
                const fees = transactionSummary.transactionSumsByType.find(
                    sum => sum.transactionType === InstitutionAccountTransactionType.FEE
                );
                const dividends = transactionSummary.transactionSumsByType.find(
                    sum => sum.transactionType === InstitutionAccountTransactionType.DIVIDEND
                );
                const interest = transactionSummary.transactionSumsByType.find(
                    sum => sum.transactionType === InstitutionAccountTransactionType.INTEREST
                );
                await manager
                    .getRepository(GLAccountReconciliation)
                    .createQueryBuilder('reconciliation')
                    .update()
                    .where('id = :id', { id: reconciliation.id })
                    .set({
                        startingBalance: holdingChangeSummary.openingBalance,
                        endingBalance: holdingChangeSummary.closingBalance,
                        changeInInvestmentValue: changeInInvesmentValue,
                        deposits: deposits,
                        withdrawals: withdrawals,
                        fees: fees.valueSum,
                        dividends: dividends.valueSum,
                        interest: interest.valueSum,
                        buys: buys.valueSum,
                        buysUnits: buys.unitSum,
                        sells: sells.valueSum,
                        sellsUnits: sells.unitSum,
                        stockTransfers: totalTransferAmount,
                        stockTransfersUnits: transfers.unitSum
                    })
                    .execute();

                return newUnitPrice;
            }

            if (glAccountTypes.includes(GLAccountTypeName.PRIMARY)) {
                const cashDetails = transactionDetails.filter(
                    isType(TransactionDetailTypeName.CASH_IN)
                );
                if (cashDetails.length > 0) {
                    await accountingUtil.postContributionCashEntries(manager, cashDetails);
                }
            }

            if (glAccountTypes.includes(GLAccountTypeName.GRANT_DISBURSEMENT)) {
                const cashDetails = transactionDetails.filter(
                    isType(TransactionDetailTypeName.CASH_OUT)
                );
                if (cashDetails.length > 0) {
                    await accountingUtil.postGrantPaymentJournalEntries(manager, cashDetails);
                }
            }

            if (glAccountTypes.includes(GLAccountTypeName.INVESTMENT)) {
                const investment = reconciliation.glAccount.investment;
                const investmentDetails = transactionDetails.filter(
                    isType(TransactionDetailTypeName.INVESTMENT)
                );
                const divestmentDetails = transactionDetails.filter(
                    isType(TransactionDetailTypeName.DIVESTMENT)
                );
                const transferDetails = transactionDetails.filter(
                    isType(TransactionDetailTypeName.TRANSFER)
                );
                const contributionDetails = transactionDetails.filter(
                    isType(TransactionDetailTypeName.CASH_IN)
                );

                let allDetails = investmentDetails
                    .concat(divestmentDetails)
                    .concat(transferDetails);

                if (allDetails.length === 0) {
                    return;
                }
                allDetails = await processTransactionDetails(
                    manager,
                    allDetails,
                    reconciliation.glAccountId
                );

                // Post journal entries
                const interestDetails = transactionDetails.filter(
                    isType(TransactionDetailTypeName.INTEREST)
                );
                const dividendDetails = transactionDetails.filter(
                    isType(TransactionDetailTypeName.DIVIDEND)
                );

                const sellDetails = transactionDetails.filter(
                    isType(TransactionDetailTypeName.SELL)
                );

                await accountingUtil.postInterestJournalEntries(manager, interestDetails);
                await accountingUtil.postDividendJournalEntries(manager, interestDetails);
                await accountingUtil.postDivestmentJournalEntries(manager, divestmentDetails);
                await accountingUtil.postContributionJournalEntries(manager, contributionDetails);
                await accountingUtil.postGainLossJournalEntries(manager, sellDetails);

                if (investment.investmentType === InvestmentType.POOL) {
                    // Get change in investment value, update unit price for pool
                    const newUnitPrice = await updateUnitPrice(reconciliation, manager);
                    tranContext.log(
                        `ReconciliationSubmitted: Account ${reconciliation.glAccount.investment.name} - updateUnitPrice Updated pool unit price to ${newUnitPrice}`
                    );

                    // Assign number of units to each transaction based on new unit price
                    allDetails = await Promise.all(
                        allDetails.map(async detail => {
                            const units = currency.divide(detail.amount, newUnitPrice, 14);
                            detail.units = units;
                            await detailRepo.update(detail.id, { units: units });
                            return detail;
                        })
                    );

                    const unitPrices = await getInvestmentUnitPrices(manager);

                    // Calculate changes in holding units from investments and divestments
                    const unitChangePerFundInvestment = allDetails.reduce(
                        totalUnitChangePerFundInvestmentReducer,
                        {}
                    );

                    const payableReceivableChangesByFundInvestment = await totalPayableReceivableChanges(
                        manager,
                        allDetails,
                        reconciliation.glAccountId
                    );

                    for (const fundInvestmentId in unitChangePerFundInvestment) {
                        const value = unitChangePerFundInvestment[fundInvestmentId];
                        tranContext.log(
                            `ReconciliationSubmitted: Account ${reconciliation.glAccount.investment.name} - updatePoolHoldingByFundInvestment Updating pool holding units fundInvestmentId ${fundInvestmentId}) (units ${value})`
                        );
                        try {
                            await poolInvestmentUtil.updatePoolHoldingByFundInvestment(
                                fundInvestmentId,
                                value,
                                null,
                                null,
                                manager
                            );
                        } catch (error) {
                            tranContext.warn(
                                `ReconciliationSubmitted: Account ${reconciliation.glAccount.investment.name} - updatePoolHoldingByFundInvestment Updating pool holding units failed fundInvestmentId ${fundInvestmentId}) (units ${value}) - Error: ${error.message}`
                            );
                            throw error;
                        }
                    }

                    for (const fundInvestmentId in payableReceivableChangesByFundInvestment) {
                        const values = payableReceivableChangesByFundInvestment[fundInvestmentId];
                        tranContext.log(
                            `ReconciliationSubmitted: Account ${
                                reconciliation.glAccount.investment.name
                            } - updatePoolHoldingByFundInvestment Updating pool holding payable/receivable on (fundInvestmentId ${fundInvestmentId}) (values ${JSON.stringify(
                                values
                            )})`
                        );
                        try {
                            await poolInvestmentUtil.updatePoolHoldingByFundInvestment(
                                fundInvestmentId,
                                0,
                                values.payable,
                                values.receivable,
                                manager
                            );
                        } catch (error) {
                            tranContext.warn(
                                `ReconciliationSubmitted: Account ${
                                    reconciliation.glAccount.investment.name
                                } - updatePoolHoldingByFundInvestment Updating pool holding payable/receivable failed on (fundInvestmentId ${fundInvestmentId}) (values ${JSON.stringify(
                                    values
                                )}) - Error: ${error.message}`
                            );
                            throw error;
                        }
                    }

                    // Update existing holdings in this investment
                    await poolInvestmentUtil.updatePoolHoldings(manager, investment.id);

                    let totalUnitChange = 0;
                    for (const fundInvestmentId in unitChangePerFundInvestment) {
                        totalUnitChange = currency.add(
                            totalUnitChange,
                            unitChangePerFundInvestment[fundInvestmentId],
                            14
                        );
                    }

                    // Update total units on the investment
                    const newTotalUnits = currency.add(investment.totalUnits, totalUnitChange, 14);
                    await investmentRepo.update(investment.id, { totalUnits: newTotalUnits });
                }
            }
        }
    );
}
