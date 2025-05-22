import { getOrCreateConnection } from '../typeorm';
import {
    Fund,
    FundInvestment,
    FundTransaction,
    FundTransactionDetail,
    GLAccount,
    TransactionDetailType,
    TransactionDetailStatus
} from '../models';
import { TransactionTypeValue } from '../models/TransactionType';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { BatchStatusValue } from '../models/Batch';
import { InvestmentType } from '../models/Investment';
import { ProposedDetailsMeta } from '../models/FundTransactionMetadata';
import { GLAccountTypeName } from '../models/GLAccountType';
import { PoolInvestmentHoldingRepository } from '../repositories/PoolInvestmentHolding';
import { HoldingRepository } from '../repositories/Holding';
import { GLAccountRepository } from '../repositories/GLAccount';
import { currency } from '../utilities/currency';
import { accountingUtil } from '../utilities/accounting';
import { InvestmentInput } from '../inputs/Investment/InvestmentInput';
import { EntityManager } from 'typeorm';

import { TransactionMetadata, TransferMetadata } from '../models/FundTransactionMetadata';

import { FundTransactionDetailRepository } from '../repositories/FundTransactionDetail';
import { GraphQLContext } from '../context';

type InvestmentAllocations = {
    [fundInvestmentId: string]: { percentage: number; amount: number; investmentId: string };
};

interface DetailInput {
    amount: number;
    id: string;
    // optional
    metadata?: TransferMetadata | TransactionMetadata;
    source?: GLAccount;
    destination?: GLAccount;
    transactionDateTime?: Date;
    resolvedDateTime?: Date;
    userProfileId?: string;
}

function isFullyReconciled(transactionDetail: FundTransactionDetail): boolean {
    return transactionDetail.batch.status === BatchStatusValue.POSTED;
}


async function getDivestmentAllocations(
    manager: EntityManager,
    fundId: string,
    transactionAmount: number,
    instructions?: InvestmentInput[]
): Promise<InvestmentAllocations> {
    const poolHoldingRepo = manager.getCustomRepository(PoolInvestmentHoldingRepository);
    const holdingRepo = manager.getCustomRepository(HoldingRepository);
    const fund = await manager
        .getRepository(Fund)
        .createQueryBuilder('fund')
        .innerJoinAndSelect('fund.investments', 'investments')
        .innerJoinAndSelect('investments.investment', 'investment')
        .where('fund.id = :fundId', { fundId: fundId })
        .orderBy('investment.orderNum', 'ASC')
        .getOne();

    const glAccountsByInvestment = await accountingUtil.getGLAccountsByInvestment(manager);
    fund.investments.sort((a, b) => a.investment.orderNum - b.investment.orderNum);
    const allowedFundInvestments = fund.investments.filter(fi => {
        return (
            [InvestmentType.POOL, InvestmentType.IMA].includes(fi.investment.investmentType) &&
            glAccountsByInvestment.hasOwnProperty(fi.investmentId)
        ); // Ensure that investment is a pool or AMA AND is linked to a GL account
    });
    const [poolHoldings, imaHoldings] = await Promise.all([
        poolHoldingRepo.getCurrentPoolHoldingsForFund(fund.id),
        holdingRepo.getCurrentIMAHoldingsForFund(fund.id)
    ]);
    transactionAmount = Math.abs(transactionAmount);

    const availableBalances: { [fundInvestmentId: string]: number } = {};

    for (const holding of poolHoldings) {
        availableBalances[holding.fundInvestmentId] = holding.netValue;
    }

    const imaFundInvestments = allowedFundInvestments.filter(
        fi => fi.investment.investmentType === InvestmentType.IMA
    );
    for (const fundInvestment of imaFundInvestments) {
        const totalValue = imaHoldings
            .filter(h => h.institutionAccount.investment.id === fundInvestment.investmentId)
            .reduce((sum, h) => currency.add(sum, h.marketValue), 0);
        availableBalances[fundInvestment.id] = totalValue;
    }
    const allocations: InvestmentAllocations = {};
    let instructionAllocations: InvestmentAllocations = {};
    let remainder = 0;
    if (instructions) {
        instructionAllocations = instructions.reduce((amountsById, instruction) => {
            const fundInvestment = fund.investments.find(
                fundInvestment => fundInvestment.investmentId === instruction.investmentId
            );
            const amount = currency.multiply(instruction.percentage, transactionAmount);
            amountsById[fundInvestment.id] = {
                percentage: instruction.percentage,
                amount: amount,
                investmentId: fundInvestment.investmentId
            };
            return amountsById;
        }, {});
        // Try instructions first
        for (const fundInvestment of fund.investments) {
            if (
                instructionAllocations.hasOwnProperty(fundInvestment.id) &&
                instructionAllocations[fundInvestment.id].percentage > 0
            ) {
                let percentage = instructionAllocations[fundInvestment.id]?.percentage;
                // Calculate amount and add any remainder from previous iterations
                const requestedAmount = currency.multiply(transactionAmount, percentage);
                let amount = requestedAmount;
                const allowedFundInvestment = allowedFundInvestments.find(
                    fi => fi.id === fundInvestment.id
                );
                if (!allowedFundInvestment) {
                    remainder = currency.add(remainder, requestedAmount);
                    continue;
                }
                // Recalculate percentage to account for any added remainder
                percentage = currency.divide(amount, transactionAmount, 8);
                // Check if holding has enough balance available. Only take what is available if not.
                const availableBalance = availableBalances[fundInvestment.id];
                if (!availableBalance || requestedAmount > availableBalance) {
                    if (availableBalance && availableBalance > 0) {
                        amount = availableBalances[fundInvestment.id];
                        remainder = currency.add(
                            remainder,
                            currency.subtract(requestedAmount, amount)
                        );
                        percentage = currency.divide(amount, transactionAmount, 8);
                    } else {
                        delete allocations[fundInvestment.id]; // Remove allocation if balance is not positive
                        remainder = currency.add(remainder, requestedAmount);
                        continue;
                    }
                }
                availableBalances[fundInvestment.id] = currency.subtract(
                    availableBalance,
                    amount
                );
                if (amount > 0) {
                    allocations[fundInvestment.id] = {
                        percentage: percentage,
                        amount: amount,
                        investmentId: fundInvestment.investmentId
                    };
                }
            }
        }
    } else {
        for (const fundInvestment of fund.investments) {
            let percentage = fundInvestment.divestmentPercentage;
            // Calculate amount and add any remainder from previous iterations
            const requestedAmount = currency.multiply(transactionAmount, percentage);
            let amount = requestedAmount;
            // Recalculate percentage to account for any added remainder
            percentage = currency.divide(amount, transactionAmount, 8);
            // Check if holding has enough balance available. Only take what is available if not.
            const allowedFundInvestment = allowedFundInvestments.find(
                fi => fi.id === fundInvestment.id
            );
            if (!allowedFundInvestment) {
                remainder = currency.add(remainder, requestedAmount);
                continue;
            }
            const availableBalance = availableBalances[fundInvestment.id];
            if (!availableBalance || requestedAmount > availableBalance) {
                if (availableBalance && availableBalance > 0) {
                    amount = availableBalances[fundInvestment.id];
                    remainder = currency.add(
                        remainder,
                        currency.subtract(requestedAmount, amount)
                    );
                    percentage = currency.divide(amount, transactionAmount, 8);
                } else {
                    delete allocations[fundInvestment.id]; // Remove allocation if balance is not positive
                    remainder = currency.add(remainder, requestedAmount);
                    continue;
                }
            }
            availableBalances[fundInvestment.id] = currency.subtract(availableBalance, amount);
            if (amount > 0) {
                allocations[fundInvestment.id] = {
                    percentage: percentage,
                    amount: amount,
                    investmentId: fundInvestment.investmentId
                };
            }
        }
    }
    // Allocate remainder to other investments
    if (fund.divestmentFallback) {
        while (remainder > 0) {
            const fundInvestmentWithAvailableBalance = Object.keys(availableBalances).find(
                fundInvestmentId => availableBalances[fundInvestmentId] > 0
            );
            if (!fundInvestmentWithAvailableBalance) {
                throw new Error('Cannot allocate requested divestments');
            }
            const fundInvestment = allowedFundInvestments.find(
                fundInvestment => fundInvestment.id === fundInvestmentWithAvailableBalance
            );

            const availableBalance = availableBalances[fundInvestment.id];
            const additionalAmount = Math.min(remainder, availableBalance);

            const amount = currency.add(
                additionalAmount,
                allocations[fundInvestment.id]?.amount ?? 0
            );
            const percentage = currency.divide(amount, transactionAmount, 8);
            remainder = currency.subtract(remainder, additionalAmount);
            availableBalances[fundInvestment.id] = currency.subtract(
                availableBalance,
                additionalAmount
            );

            allocations[fundInvestment.id] = {
                percentage: percentage,
                amount: amount,
                investmentId: fundInvestment.investmentId
            };
        }
    }
    Object.values(allocations).forEach(allocation => {
        allocation.amount = -1 * allocation.amount; // Convert amounts to negative
    });

    return allocations;
}

async function getInvestmentAllocations(
    manager: EntityManager,
    fundId: string,
    transactionAmount: number,
    instructions?: InvestmentInput[]
): Promise<InvestmentAllocations> {
    const fund = await manager
        .getRepository(Fund)
        .findOne(fundId, { relations: ['investments', 'investments.investment'] });
    const glAccountsByInvestment = await accountingUtil.getGLAccountsByInvestment(manager);
    const fundInvestments = fund.investments.filter(fi => {
        return (
            [InvestmentType.POOL, InvestmentType.IMA].includes(fi.investment.investmentType) &&
            glAccountsByInvestment.hasOwnProperty(fi.investmentId)
        ); // Ensure that investment is a pool or AMA AND is linked to a GL account
    });

    const imaFundInvestments = fundInvestments.filter(
        fi => fi.investment.investmentType === InvestmentType.IMA
    );
    let allocations: InvestmentAllocations;
    if (instructions) {
        allocations = instructions.reduce((amountsById, instruction) => {
            const fundInvestment = fund.investments.find(
                fundInvestment => fundInvestment.investmentId === instruction.investmentId
            );
            if (!fundInvestment) {
                return amountsById;
            }
            const amount = currency.multiply(instruction.percentage, transactionAmount);
            if (amount > 0) {
                amountsById[fundInvestment.id] = {
                    percentage: instruction.percentage,
                    amount: amount,
                    investmentId: instruction.investmentId
                };
            }
            return amountsById;
        }, {});
    } else {
        allocations = fundInvestments.reduce((amountsById, fundInvestment) => {
            const percentage = fundInvestment.allocationPercentage;
            const amount = currency.multiply(transactionAmount, percentage);
            if (amount > 0) {
                amountsById[fundInvestment.id] = {
                    percentage: percentage,
                    amount: amount,
                    investmentId: fundInvestment.investmentId
                };
            }
            return amountsById;
        }, {});
    }

    return allocations;
}

export function isComplete(transactionDetail: FundTransactionDetail): boolean {
    return (
        transactionDetail.transactionDetailStatus.name === TransactionDetailStatusValue.COMPLETE
    );
}

export function isType(detailTypeName: TransactionDetailTypeName): (detail: FundTransactionDetail) => boolean {
    return detail => detail.transactionDetailType.name === detailTypeName;
}

export function totalUnitChangePerFundInvestmentReducer(
    changesByFundInvestment: { [fundInvestmentId: string]: number },
    detail: FundTransactionDetail
): { [fundInvestmentId: string]: number } {
    const fiId = detail.fundInvestmentId;
    if (!changesByFundInvestment.hasOwnProperty(fiId)) {
        changesByFundInvestment[fiId] = 0;
    }
    changesByFundInvestment[fiId] = currency.add(
        detail.units ?? 0,
        changesByFundInvestment[fiId],
        14
    );
    return changesByFundInvestment;
}

export async function createProposedDetails(
    manager: EntityManager,
    transactionId: string,
    instructions?: InvestmentInput[],
    amountOverride?: number
): Promise<ProposedDetailsMeta[]> {
    const detailTypeRepo = manager.getRepository(TransactionDetailType);
    const detailStatusRepo = manager.getRepository(TransactionDetailStatus);

    const transaction = await manager.getRepository(FundTransaction).findOne(transactionId, {
        relations: [
            'fund',
            'fund.investments',
            'fund.investments.investment',
            'transactionType'
        ]
    });
    const transactionType = transaction.transactionType.name;

    const detailPendingStatus = await detailStatusRepo.findOne({
        name: TransactionDetailStatusValue.PENDING
    });
    const [glAccountsByType, glAccountsByInvestment] = await Promise.all([
        accountingUtil.getGLAccountsByType(manager),
        accountingUtil.getGLAccountsByInvestment(manager)
    ]);
    let detailType: TransactionDetailType;
    let allocations: InvestmentAllocations;
    let sourceAccount: GLAccount;
    let destinationAccount: GLAccount;

    if (
        [
            TransactionTypeValue.TRANSFER_OUT,
            TransactionTypeValue.GRANT,
            TransactionTypeValue.ADMINISTRATION_FEE,
            TransactionTypeValue.INVESTMENT_FEE
        ].includes(transactionType)
    ) {
        detailType = await detailTypeRepo.findOne({
            name: TransactionDetailTypeName.DIVESTMENT
        });
        allocations = await getDivestmentAllocations(
            manager,
            transaction.fund.id,
            amountOverride ?? transaction.amount,
            instructions
        );
    } else if (
        [TransactionTypeValue.TRANSFER_IN, TransactionTypeValue.CONTRIBUTION].includes(
            transactionType
        )
    ) {
        detailType = await detailTypeRepo.findOne({
            name: TransactionDetailTypeName.INVESTMENT
        });
        allocations = await getInvestmentAllocations(
            manager,
            transaction.fund.id,
            amountOverride ?? transaction.amount,
            instructions
        );
    }
    const isTransfer = [
        TransactionTypeValue.TRANSFER_IN,
        TransactionTypeValue.TRANSFER_OUT
    ].includes(transactionType);

    const transactionDetails = await Promise.all(
        Object.keys(allocations).map(async fundInvestmentId => {
            const { amount, percentage, investmentId } = allocations[fundInvestmentId];
            const fundInvestment = transaction.fund.investments.find(
                fundInvestment => fundInvestmentId === fundInvestment.id
            );

            if (detailType.name === TransactionDetailTypeName.DIVESTMENT) {
                sourceAccount = glAccountsByInvestment[investmentId];
                destinationAccount = glAccountsByType[GLAccountTypeName.GRANT_DISBURSEMENT];
            } else if (detailType.name === TransactionDetailTypeName.INVESTMENT) {
                if (isTransfer) {
                    sourceAccount = glAccountsByType[GLAccountTypeName.GRANT_DISBURSEMENT];
                    destinationAccount = glAccountsByInvestment[investmentId];
                } else {
                    sourceAccount = glAccountsByType[GLAccountTypeName.PRIMARY];
                    destinationAccount = glAccountsByInvestment[investmentId];
                }
            }

            return {
                transactionDetailStatusId: detailPendingStatus.id,
                transactionDetailTypeId: detailType.id,
                fundTransactionId: transaction.id,
                sourceAccountId: sourceAccount.id,
                destinationAccountId: destinationAccount.id,
                fundInvestmentId: fundInvestmentId,
                fundInvestmentName: fundInvestment.investment.name,
                investmentId: investmentId,
                amount: amount,
                percentage: percentage,
                resolvedDateTime: new Date(),
                createdBy: transaction.userProfileId
            };
        })
    );
    return transactionDetails;
}

/**
 * @important
 *
 * this function creates a FundTransactionDetail record but does NOT save it
 */
async function createInvestmentDetails(
    manager: EntityManager,
    fund: Fund,
    input: DetailInput
): Promise<FundTransactionDetail[]> {
    const detailRepo = manager.getCustomRepository(FundTransactionDetailRepository);

    // fetch status and types
    const [detailPendingStatus, detailInvestmentType] = await Promise.all([
        manager.findOne(TransactionDetailStatus, {
            name: TransactionDetailStatusValue.PENDING
        }),
        manager.findOne(TransactionDetailType, {
            name: TransactionDetailTypeName.INVESTMENT
        })
    ]);

    const investmentAllocations = await getInvestmentAllocations(
        manager,
        fund.id,
        input.amount,
        input.metadata.proposedDetails
    );
    const transactionDetails = await Promise.all(
        fund.investments.map(async fundInvestment => {
            if (!(fundInvestment.id in investmentAllocations)) {
                return null;
            }
            const amount = investmentAllocations[fundInvestment.id].amount;

            const [sourceAccount, destinationAccount] = await Promise.all([
                detailRepo.getSourceAccountForDetailTypeName(
                    detailInvestmentType.name,
                    fundInvestment.id
                ),
                detailRepo.getDestinationAccountForDetailTypeName(
                    detailInvestmentType.name,
                    fundInvestment.id
                )
            ]);

            return manager.create(FundTransactionDetail, {
                transactionDetailStatusId: detailPendingStatus.id,
                transactionDetailTypeId: detailInvestmentType.id,
                fundTransactionId: input.id,
                sourceAccount: sourceAccount,
                destinationAccount: destinationAccount,
                fundInvestmentId: fundInvestment.id,
                amount: amount,
                resolvedDateTime: input.resolvedDateTime
            });
        })
    );
    return transactionDetails.filter(d => d !== null);
}

/**
 * @important
 *
 * this function creates a FundTransactionDetail record but does NOT save it
 */
export async function createDivestmentDetails(
    manager: EntityManager,
    fund: Fund,
    input: DetailInput
): Promise<FundTransactionDetail[]> {
    const detailRepo = manager.getCustomRepository(FundTransactionDetailRepository);

    // fetch status and types
    const [detailPendingStatus, detailDivestmentType] = await Promise.all([
        manager.findOne(TransactionDetailStatus, {
            name: TransactionDetailStatusValue.PENDING
        }),
        manager.findOne(TransactionDetailType, {
            name: TransactionDetailTypeName.DIVESTMENT
        })
    ]);

    // destructure metadata
    const { description, proposedDetails } = input.metadata || {};

    const instructions = proposedDetails
        ? proposedDetails.map(d => {
              return { investmentId: d.investmentId, percentage: d.percentage };
          })
        : null;

    const divestmentAllocations = await getDivestmentAllocations(
        manager,
        fund.id,
        input.amount,
        instructions
    );
    const transactionDetails = await Promise.all(
        fund.investments.map(async fundInvestment => {
            if (!(fundInvestment.id in divestmentAllocations)) {
                return null;
            }
            const amount = divestmentAllocations[fundInvestment.id].amount;

            // either from arguments or get by detail type
            const [sourceAccount, destinationAccount] = await Promise.all([
                input.source ||
                    detailRepo.getSourceAccountForDetailTypeName(
                        detailDivestmentType.name,
                        fundInvestment.id
                    ),
                input.destination ||
                    detailRepo.getDestinationAccountForDetailTypeName(
                        detailDivestmentType.name,
                        fundInvestment.id
                    )
            ]);

            return manager.create(FundTransactionDetail, {
                transactionDetailStatusId: detailPendingStatus.id,
                transactionDetailTypeId: detailDivestmentType.id,
                fundTransactionId: input.id,
                fundInvestmentId: fundInvestment.id,
                // source/destinations
                sourceAccount: sourceAccount,
                sourceAccountId: sourceAccount.id,
                destinationAccount: destinationAccount,
                destinationAccountId: destinationAccount.id,
                amount: amount,
                // custom inputs
                description: description,
                resolvedDateTime: input.resolvedDateTime,
                transactionDateTime: input.transactionDateTime || new Date(),
                createdBy: input.userProfileId,
                updatedBy: input.userProfileId
            });
        })
    );
    return transactionDetails.filter(d => d !== null);
}

export async function createCashTransactionDetails(
    manager: EntityManager,
    cashTransactionDetailIds: string[]
) {
    const detailRepo = manager.getCustomRepository(FundTransactionDetailRepository);

    for (const cashTransactionDetailId of cashTransactionDetailIds) {
        const cashTransactionDetail = await detailRepo
            .createQueryBuilder('transactionDetail')
            .leftJoinAndSelect('transactionDetail.fundInvestment', 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.fund', 'fund')
            .leftJoinAndSelect('fund.investments', 'investments')
            .leftJoinAndSelect('investments.investment', 'investment')
            .leftJoinAndSelect('transactionDetail.transactionDetailType', 'transactionDetailType')
            .leftJoinAndSelect('transactionDetail.fundTransaction', 'fundTransaction')
            .where('transactionDetail.id = :id', { id: cashTransactionDetailId })
            .getOne();

        const cashTransactionDetailType = cashTransactionDetail.transactionDetailType.name;
        const fund = cashTransactionDetail.fundInvestment.fund;
        const input = {
            amount: cashTransactionDetail.amount,
            id: cashTransactionDetail.fundTransactionId,
            metadata: cashTransactionDetail.fundTransaction.metadata,
            resolvedDateTime: new Date()
        };

        let transactionDetails: FundTransactionDetail[];

        if (cashTransactionDetailType === TransactionDetailTypeName.CASH_IN) {
            transactionDetails = await createInvestmentDetails(manager, fund, input);
        } else if (cashTransactionDetailType === TransactionDetailTypeName.GRANT_DIVESTMENT_CASH) {
            transactionDetails = await createDivestmentDetails(manager, fund, input);
        }

        await detailRepo.save(transactionDetails);
    }
}
