import { EntityRepository, Repository } from 'typeorm';
import {
    FundTransaction,
    FundTransactionDetail,
    FundInvestment,
    TransactionStatus
} from '../models';
import { getInvestmentUnitPrices } from '../utilities/funds';
import { InvestmentType } from '../models/Investment';
import { FundTransactionDetailRepository } from '../repositories/FundTransactionDetail';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionStatusValue } from '../models/TransactionStatus';

@EntityRepository(FundTransaction)
export class FundTransactionRepository extends Repository<FundTransaction> {
    async getDivestmentAllocations(transaction: FundTransaction, batchId?: string) {
        // get latest unit prices
        const unitPrices = await getInvestmentUnitPrices(this.manager);

        // get fund investments
        const fundInvestments = await this.manager
            .createQueryBuilder(FundInvestment, 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .leftJoinAndSelect('investment.institutionAccount', 'institutionAccount')
            .orderBy('investment.orderNum', 'ASC')
            .where('fundInvestment.fundId = :fundId', { fundId: transaction.fundId })
            .andWhere('investment.investmentType IN (:...types)', {
                types: [InvestmentType.POOL, InvestmentType.IMA]
            })
            .getMany();

        // return empty allocations if divestment status is not READY_FOR_DIVESTMENT
        const cashDetail = await this.manager
            .getCustomRepository(FundTransactionDetailRepository)
            .getCashDetailForTransaction(
                transaction,
                TransactionDetailTypeName.GRANT_DIVESTMENT_CASH
            );
        if (
            cashDetail.transactionDetailStatus.name !==
            TransactionDetailStatusValue.READY_FOR_DIVESTMENT
        ) {
            return fundInvestments.reduce((result, fundInvestment) => {
                result.push({
                    name: fundInvestment.investment.name,
                    amount: 0
                });
                return result;
            }, []);
        }

        // get sibling transactions
        const transactionsQuery = this.manager
            .createQueryBuilder(FundTransaction, 'fundTransaction')
            .leftJoin('fundTransaction.transactionDetails', 'transactionDetails')
            .leftJoin('transactionDetails.transactionDetailType', 'transactionDetailType')
            .innerJoin('transactionDetails.transactionDetailStatus', 'transactionDetailStatus')
            .where('fundTransaction.fundId = :fundId', { fundId: transaction.fundId })
            .andWhere('transactionDetailStatus.name = :status', {
                status: TransactionDetailStatusValue.READY_FOR_DIVESTMENT
            })
            .orderBy('fundTransaction.transactionDateTime', 'ASC');

        // filter by batch id
        if (batchId) {
            transactionsQuery.andWhere('fundTransaction.fundTransactionBatchId = :batchId', {
                batchId
            });
        }

        const transactions = await transactionsQuery.getMany();

        // calculate available totals in each fund investment
        const totals = fundInvestments.reduce((totals, fundInvestment) => {
            if (fundInvestment.investment.investmentType == InvestmentType.POOL) {
                // Add unitized amount for pool
                totals[fundInvestment.investment.id] =
                    fundInvestment.units * unitPrices[fundInvestment.investmentId];
            } else if (fundInvestment.investment.investmentType == InvestmentType.IMA) {
                // Add account balance for IMA
                totals[fundInvestment.investment.id] =
                    fundInvestment.investment.institutionAccount.marketValue;
            }
            return totals;
        }, {});

        // calculate allocations for all related transactions, indexed by transaction ID
        const allocations = await transactions.reduce(async (allocations, transaction) => {
            let remainder = 0;

            const cashTransactionDetail = await this.manager
                .getCustomRepository(FundTransactionDetailRepository)
                .getCashDetailForTransaction(
                    transaction,
                    TransactionDetailTypeName.GRANT_DIVESTMENT_CASH
                );

            const transactionAllocations = fundInvestments.reduce(
                (transactionAllocations, fundInvestment) => {
                    // calculate the desired allocation (based on the divestment percentages),
                    // plus any remainder from previous iterations that had insufficient balance
                    const amountToAllocate =
                        Math.abs(cashTransactionDetail.amount) *
                            fundInvestment.divestmentPercentage +
                        remainder;

                    // allocate as much to this fund investment as possible without exceeding the balance
                    transactionAllocations[fundInvestment.investment.id] = Math.min(
                        amountToAllocate,
                        totals[fundInvestment.investment.id]
                    );

                    // recalculate the remainder
                    remainder = Math.max(
                        amountToAllocate - totals[fundInvestment.investment.id],
                        0
                    );

                    return transactionAllocations;
                },
                {}
            );

            while (parseFloat(remainder.toFixed(2)) > 0) {
                let additionalAllocation = 0;

                // find the first fund investment with an available balance
                let fundInvestmentWithAvailableBalance = fundInvestments.find(
                    fundInvestment =>
                        totals[fundInvestment.investment.id] >
                        transactionAllocations[fundInvestment.investment.id]
                );

                if (fundInvestmentWithAvailableBalance === undefined) {
                    // throw new Error(
                    //     'No remaining fund investments with amounts greater than initial allocations'
                    // );

                    // TODO: Get clarification on how to handle this
                    fundInvestmentWithAvailableBalance = fundInvestments[0];
                    additionalAllocation = remainder;
                } else {
                    // allocate as much of the remainder to this fund investment
                    // as possible without exceeding the balance
                    additionalAllocation = Math.min(
                        remainder,
                        parseFloat(
                            (
                                totals[fundInvestmentWithAvailableBalance.investment.id] -
                                transactionAllocations[
                                    fundInvestmentWithAvailableBalance.investment.id
                                ]
                            ).toFixed(2)
                        )
                    );
                }

                // update the allocation value
                transactionAllocations[
                    fundInvestmentWithAvailableBalance.investment.id
                ] += additionalAllocation;

                // update the remainder
                remainder -= additionalAllocation;
            }

            // update totals
            Object.keys(transactionAllocations).forEach(investmentId => {
                totals[investmentId] -= transactionAllocations[investmentId];
            });

            return {
                ...allocations,
                [transaction.id]: transactionAllocations
            };
        }, {});

        // return results for this transaction, indexed by investment name
        return Object.keys(allocations[transaction.id]).reduce((result, investmentId) => {
            const name = fundInvestments.find(
                fundInvestment => fundInvestment.investment.id === investmentId
            ).investment.name;

            result.push({
                name,
                amount: allocations[transaction.id][investmentId]
            });

            return result;
        }, []);
    }

    async updateTransactionStatus(
        transaction: FundTransaction,
        statusName: TransactionStatusValue
    ) {
        const status = await this.manager.findOne(TransactionStatus, { name: statusName });
        await this.manager
            .getRepository(FundTransaction)
            .update(transaction.id, { transactionStatusId: status.id });
        return this.manager.findOne(FundTransaction, { id: transaction.id });
    }
}
