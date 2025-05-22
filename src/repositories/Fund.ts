import { EntityRepository, Repository, SelectQueryBuilder } from 'typeorm';

import { Fund, FundTransaction, FundTransactionDetail } from '../models';
import { HoldingRepository } from '../repositories/Holding';
import { PoolInvestmentHoldingRepository } from '../repositories/PoolInvestmentHolding';
import { currency } from '../utilities/currency';
const util = require('util')
@EntityRepository(Fund)
export class FundRepository extends Repository<Fund> {
    async getAmountPendingIncoming(id: string): Promise<number> {
        const [result] = await this.query(/*sql*/ `
            SELECT * FROM get_fund_amount_pending_incoming('${id}')
        `);
        return parseFloat(result[Object.keys(result)[0]]);
    }
    formatPendingData(data: FundTransaction[]){
        const transactionDetailTypes = ['CASH_IN', 'CASH_OUT', 'STOCK_IN']
        const formattedData = []
        data.map((tr: FundTransaction) => {
            formattedData.push({
                type: tr.transactionType.name,
                amount: tr.amount,
                transactionCode: tr.transactionCode,
                transactionStatus: tr.transactionStatus.name,
                transactionDetails: tr.transactionDetails
            })
        })
        return formattedData;
    }
    async getPendingDeposits(skip: number, take: number, id: string): Promise<any> {
        const transactionTypes = ['CONTRIBUTION', 'TRANSFER_IN', 'DIVIDEND', 'INTEREST' ]
        const transactionStatus = ['CANCELED', 'SCHEDULED', 'COMPLETE']
        let result = await this.manager.find(FundTransaction ,{
            where: {
                fundId: id,
            },
            relations: ['transactionStatus', 'transactionDetails', 'transactionType', 'transactionDetails.batch', 'transactionDetails.transactionDetailType'],
        })
        result = result
        .filter((tr: FundTransaction) => transactionTypes.includes(tr.transactionType.name))
        .filter((tr: FundTransaction) => !transactionStatus.includes(tr.transactionStatus.name))
        const formattedData = this.formatPendingData(result)
        return formattedData;
    }
    async getPendingDepositsCount(id: string): Promise<any> {
        const result = await this.query(/*sql*/ `
            SELECT COUNT("fund_transaction"."id")
            FROM "fund_transaction"
            LEFT JOIN "transaction_status"
                ON "fund_transaction"."transaction_status_id" = "transaction_status"."id"
            LEFT JOIN "transaction_type"
                ON "fund_transaction"."transaction_type_id" = "transaction_type"."id"
            LEFT JOIN "fund_transaction_detail"
                ON "fund_transaction"."id" = "fund_transaction_detail"."fund_transaction_id"
            WHERE "fund_transaction"."fund_id" = '${id}'
            AND "transaction_type"."name" IN (
                'CONTRIBUTION',
                'TRANSFER_IN',
                'DIVIDEND',
                'INTEREST' 
            )
            AND "transaction_status"."name" NOT IN ('CANCELED', 'SCHEDULED', 'COMPLETE');
        `);
        return result[0]?.count || 0;
    }
    async getPendingWithdrawals(skip: number, take: number, id: string): Promise<any> {
        const transactionTypes = ['GRANT',
        'TRANSFER_OUT',
        'FEE',
        'PROCESSING_FEE',
        'ADVISOR_FEE',
        'BANK_FEE',
        'INVESTMENT_FEE',
        'ADMINISTRATION_FEE' ]
        const transactionStatus = ['CANCELED', 'SUBMITTED', 'COMPLETE']
        let result = await this.manager.find(FundTransaction ,{
            where: {
                fundId: id,
            },
            relations: ['transactionStatus', 'transactionDetails', 'transactionType', 'transactionDetails.batch', 'transactionDetails.transactionDetailType'],
        })
        result = result
        .filter((tr: FundTransaction) => transactionTypes.includes(tr.transactionType.name))
        .filter((tr: FundTransaction) => !transactionStatus.includes(tr.transactionStatus.name))
        const formattedData = this.formatPendingData(result)
        return formattedData;
    }
    async getPendingWithdrawalsCount(id: string): Promise<any> {
        const result = await this.query(/*sql*/ `
            SELECT COUNT("fund_transaction"."id")
            FROM "fund_transaction"
            LEFT JOIN "transaction_status"
                ON "fund_transaction"."transaction_status_id" = "transaction_status"."id"
            LEFT JOIN "transaction_type"
                ON "fund_transaction"."transaction_type_id" = "transaction_type"."id"
            WHERE "fund_transaction"."fund_id" = '${id}'
            AND "transaction_type"."name" IN (
                'GRANT',
                'TRANSFER_OUT',
                'FEE',
                'PROCESSING_FEE',
                'ADVISOR_FEE',
                'BANK_FEE',
                'INVESTMENT_FEE',
                'ADMINISTRATION_FEE'
            )
            AND "transaction_status"."name" NOT IN ('CANCELED', 'SUBMITTED', 'COMPLETE');

        `);
        return result[0]?.count || 0;
    }


    async getAmountPendingOutgoing(id: string): Promise<number> {
        const [result] = await this.query(/*sql*/ `
            SELECT * FROM get_fund_amount_pending_outgoing('${id}')
        `);
        return parseFloat(result[Object.keys(result)[0]]);
    }

    async getCashBalance(fund: Fund): Promise<number> {
        const poolHoldingRepo = this.manager.getCustomRepository(PoolInvestmentHoldingRepository);
        return await poolHoldingRepo.getCurrentCashHoldingValueForFund(fund.id);
    }
    async getSharedStockBalance(fund: Fund): Promise<number> {
        const poolHoldingRepo = this.manager.getCustomRepository(PoolInvestmentHoldingRepository);
        return await poolHoldingRepo.getCurrentSharedStockHoldingValueForFund(fund.id);
    }

    async getCurrentBalance(fund: Fund): Promise<number> {
        const investedBalance = await this.useCalculatedInvestedBalance(fund);
        const cashBalance = await this.useCalculatedCashBalance(fund);
        const sharedStockBalance = await this.useSharedStockBalance(fund);
        const investedAndCash = currency.add(investedBalance, cashBalance);
        const investedPlusCashAndSharedStockBalance = currency.add(
            investedAndCash,
            sharedStockBalance
        );

        return investedPlusCashAndSharedStockBalance;
    }

    async getInvestedBalance(fund: Fund): Promise<number> {
        const holdingRepo = this.manager.getCustomRepository(HoldingRepository);
        const poolHoldingRepo = this.manager.getCustomRepository(PoolInvestmentHoldingRepository);

        const [imaValue, poolValue] = await Promise.all([
            holdingRepo.getCurrentIMAHoldingValueForFund(fund.id),
            poolHoldingRepo.getCurrentPoolHoldingValueForFund(fund.id)
        ]);

        return currency.add(imaValue, poolValue);
    }

    async getInvestedBalanceByFundId(fundId: string): Promise<number> {
        const fund = await this.findOne(fundId);
        return await this.getInvestedBalance(fund);
    }

    async getAvailableBalance(fund: Fund): Promise<number> {
        const investedBalance = await this.useCalculatedInvestedBalance(fund);
        const cashBalance = await this.useCalculatedCashBalance(fund);
        const sharedStockBalance = await this.useSharedStockBalance(fund);
        const investedAndCash = currency.add(investedBalance, cashBalance);
        const investedPlusCashAndSharedStockBalance = currency.add(
            investedAndCash,
            sharedStockBalance
        );

        const pending = await this.usePendingOutgoing(fund);

        if (pending > 0) {
            return currency.subtract(investedPlusCashAndSharedStockBalance, Math.abs(pending));
        }

        return investedPlusCashAndSharedStockBalance;
    }

    async getPendingBalance(fund: Fund): Promise<number> {
        const incoming = await this.usePendingIncoming(fund);
        const outgoing = await this.usePendingOutgoing(fund);
        return currency.subtract(incoming, Math.abs(outgoing));
    }

    async getTotalBalance(fund: Fund): Promise<number> {
        const currentBalance = await this.getCurrentBalance(fund);
        const pendingBalance = await this.getPendingBalance(fund);
        return currency.add(currentBalance, pendingBalance);
    }

    private async useSharedStockBalance(fund: Fund): Promise<number> {
        if (fund.sharedStockBalance !== undefined) {
            return fund.sharedStockBalance;
        }
        const balance = await this.getSharedStockBalance(fund);
        fund.sharedStockBalance = balance;
        return balance;
    }

    private async usePendingIncoming(fund: Fund): Promise<number> {
        if (fund.pendingIncoming !== undefined) {
            return fund.pendingIncoming;
        }
        const balance = await this.getAmountPendingIncoming(fund.id);
        fund.pendingIncoming = balance;
        return balance;
    }

    private async usePendingOutgoing(fund: Fund): Promise<number> {
        if (fund.pendingOutgoing !== undefined) {
            return fund.pendingOutgoing;
        }
        const balance = await this.getAmountPendingOutgoing(fund.id);
        fund.pendingOutgoing = balance;
        return balance;
    }

    private async useCalculatedInvestedBalance(fund: Fund): Promise<number> {
        if (fund.calculatedInvestedBalance !== undefined) {
            return fund.calculatedInvestedBalance;
        }
        const balance = await this.getInvestedBalance(fund);
        fund.calculatedInvestedBalance = balance;
        return balance;
    }

    private async useCalculatedCashBalance(fund: Fund): Promise<number> {
        if (fund.calculatedCashBalance !== undefined) {
            return fund.calculatedCashBalance;
        }
        const poolHoldingRepo = this.manager.getCustomRepository(PoolInvestmentHoldingRepository);
        const balance = await poolHoldingRepo.getCurrentCashHoldingValueForFund(fund.id);
        fund.calculatedCashBalance = balance;
        return balance;
    }
}
