import { Fund, FundHolding } from '../models';
import { EntityManager } from 'typeorm';
import { FundRepository } from '../repositories/Fund';
import { PoolInvestmentHoldingRepository } from '../repositories/PoolInvestmentHolding';
import { HoldingRepository } from '../repositories/Holding';
import { currency } from './currency';
import { FundHoldingsBreakdown } from '../models/FundHolding';

export async function getFundHoldingsBreakdownSansCash(
    fundId: string,
    manager: EntityManager
): Promise<FundHoldingsBreakdown> {
    const fund = await manager.getRepository(Fund).findOne(fundId);

    const fundRepo = manager.getCustomRepository(FundRepository);
    const pihRepo = manager.getCustomRepository(PoolInvestmentHoldingRepository);
    const holdingRepo = manager.getCustomRepository(HoldingRepository);

    const availableBalance = await fundRepo.getInvestedBalance(fund);
    const currentBalance = await fundRepo.getCurrentBalance(fund);
    const pendingBalance = await fundRepo.getPendingBalance(fund);
    let totalInvestedBalance = 0;

    // get investments
    const [poolHoldings, imaHoldings] = await Promise.all([
        pihRepo.getCurrentPoolHoldingsForFund(fundId),
        holdingRepo.getCurrentIMAHoldingsForFund(fundId)
    ]);

    const poolValuesByInvestment = poolHoldings.reduce((valueByInvestment, holding) => {
        const investment = holding.fundInvestment.investment;
        const id = investment.id;
        if (!valueByInvestment.hasOwnProperty(id)) {
            valueByInvestment[id] = {
                investmentId: id,
                name: investment.name,
                visualizationColor: investment.visualizationColor,
                value: 0,
                valueAsOf: holding.date,
                netValue: 0
            };
        }
        valueByInvestment[id].value = currency.add(
            valueByInvestment[id].value,
            holding.marketValue
        );
        valueByInvestment[id].netValue = currency.add(
            valueByInvestment[id].netValue,
            holding.netValue
        );
        if (holding.date > valueByInvestment[id].valueAsOf) {
            valueByInvestment[id].valueAsOf = holding.date;
        }
        totalInvestedBalance = currency.add(totalInvestedBalance, holding.netValue);
        return valueByInvestment;
    }, {});

    const imaValuesByInvestment = imaHoldings.reduce((valueByInvestment, holding) => {
        const investment = holding.institutionAccount.investment;
        const id = investment.id;
        if (!valueByInvestment.hasOwnProperty(id)) {
            valueByInvestment[id] = {
                investmentId: investment.id,
                name: holding.institutionAccount.displayName,
                visualizationColor: investment.visualizationColor,
                value: 0,
                valueAsOf: holding.date
            };
        }
        valueByInvestment[id].value = currency.add(
            valueByInvestment[id].value,
            holding.marketValue
        );
        if (holding.date > valueByInvestment[id].valueAsOf) {
            valueByInvestment[id].valueAsOf = holding.date;
        }
        totalInvestedBalance = currency.add(totalInvestedBalance, holding.marketValue);
        return valueByInvestment;
    }, {});

    const fundHoldings = [] as FundHolding[];

    if (totalInvestedBalance > 0) {
        for (const investmentId in poolValuesByInvestment) {
            const data = poolValuesByInvestment[investmentId];
            const percentageOfBalance = currency.divide(data.value, totalInvestedBalance);
            fundHoldings.push(
                new FundHolding(
                    data.investmentId,
                    data.name,
                    data.value,
                    data.valueAsOf,
                    percentageOfBalance,
                    data.visualizationColor,
                    data.netValue
                )
            );
        }
        for (const investmentId in imaValuesByInvestment) {
            const data = imaValuesByInvestment[investmentId];
            const percentageOfBalance = currency.divide(data.value, totalInvestedBalance);
            fundHoldings.push(
                new FundHolding(
                    data.investmentId,
                    data.name,
                    data.value,
                    data.valueAsOf,
                    percentageOfBalance,
                    data.visualizationColor,
                    data.value
                )
            );
        }
    }

    // this is hackey... if the total doesn't equal 100% then we've rounded off a percent... add it to the last holding
    const totalPercentage = fundHoldings.reduce((amt, cur) => amt + cur.percentageOfBalance, 0);
    if (fundHoldings.length > 0) {
        fundHoldings[fundHoldings.length - 1].percentageOfBalance += 100 - totalPercentage;
    }

    return new FundHoldingsBreakdown(
        fundHoldings,
        availableBalance,
        currentBalance,
        pendingBalance,
        totalInvestedBalance
    );
}
