import { EntityManager } from 'typeorm';
import {
    Fund,
    FundInvestment,
    FundTransaction,
    FundTransactionDetail,
    InvestmentUnitPriceHistory
} from '../models';
import { accountingUtil } from './accounting';
import { currency } from './currency';
import { InvestmentType } from '../models/Investment';
import { PoolInvestmentHoldingRepository } from '../repositories/PoolInvestmentHolding';
import { HoldingRepository } from '../repositories/Holding';

interface UnitPrices {
    [investmentId: string]: number;
}

type InvestmentAllocations = {
    [fundInvestmentId: string]: { percentage: number; amount: number; investmentId: string };
};

/**
 * Get latest close prices for fund investments, indexed by investment ID
 *
 * @param fundInvestments
 */
export async function getInvestmentUnitPrices(manager: EntityManager) {
    const result = await manager.query(/*sql*/ `
        SELECT * FROM get_latest_close_prices()
    `);

    // index by investment ID
    return result.reduce(
        (unitPrices: UnitPrices, item: { investment_id: string; close_price: number }) => {
            unitPrices[item.investment_id] = item.close_price;
            return unitPrices;
        },
        {}
    );
}

/**
 * Get dollar amount available in a fund investment
 *
 * @param fundInvestment
 * @param unitPrices
 */
export function getFundInvestmentAmount(fundInvestment: FundInvestment, unitPrices: UnitPrices) {
    return fundInvestment.units * unitPrices[fundInvestment.investmentId];
}

export async function hasHoldingsToCoverDivestmentAllocations(manager: EntityManager, grant: FundTransaction) {
    const poolHoldingRepo = manager.getCustomRepository(PoolInvestmentHoldingRepository);
    const holdingRepo = manager.getCustomRepository(HoldingRepository);
    const fund = await manager.getRepository(Fund)
        .createQueryBuilder('fund')
        .innerJoinAndSelect('fund.investments', 'investments')
        .innerJoinAndSelect('investments.investment', 'investment')
        .where('fund.id = :fundId', { fundId: grant.fundId })
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
    const transactionAmount = Math.abs(grant.amount);

    const availableBalances: { [fundInvestmentId: string]: number } = {};

    for (const holding of poolHoldings) {
        availableBalances[holding.fundInvestmentId] = holding.marketValue;
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
    let remainder = 0;

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

    if (!fund.divestmentFallback && remainder > 0) {
        return false;
    }

    while (remainder > 0) {
        const fundInvestmentWithAvailableBalance = Object.keys(availableBalances).find(
            fundInvestmentId => availableBalances[fundInvestmentId] > 0
        );
        if (!fundInvestmentWithAvailableBalance) {
            return false;
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

    return true;
}
