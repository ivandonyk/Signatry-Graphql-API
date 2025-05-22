import { UpdateResult, EntityManager } from 'typeorm';

import { getOrCreateConnection } from '../typeorm';
import { InvestmentType } from '../models/Investment';
import {
    FundInvestment,
    Investment,
    InvestmentUnitPriceHistory,
    PoolInvestmentHolding
} from '../models';
import { SecurityRepository } from '../repositories/Security';
import { FundInvestmentRepository } from '../repositories/FundInvestment';
import { PoolInvestmentHoldingRepository } from '../repositories/PoolInvestmentHolding';
import { currency } from './currency';
import { dayjs } from './datetime';
import { calculateHoldingCostAndGains } from './calculateHoldingCostAndGains';

export const poolInvestmentUtil = {
    async getCurrentUnitPrices(): Promise<{
        [investmentId: string]: { priceAsOf: Date; price: number };
    }> {
        const connection = await getOrCreateConnection();
        const investmentRepo = connection.getRepository(Investment);
        const unitPriceRepo = connection.getRepository(InvestmentUnitPriceHistory);
        const investments = await investmentRepo.find({ investmentType: InvestmentType.POOL });
        const prices = await Promise.all(
            investments.map(investment => {
                return unitPriceRepo.findOne({
                    where: { investmentId: investment.id },
                    order: { closePriceAsOf: 'DESC' }
                });
            })
        );

        // not sure if it's a data quality issue, but `prices` has undefined elements
        return prices.filter(Boolean).reduce((priceMap, price) => {
            priceMap[price.investmentId] = {
                priceAsOf: price.closePriceAsOf,
                price: price.closePrice
            };
            return priceMap;
        }, {});
    },
    async updatePoolUnitPrice(
        manager: EntityManager,
        investmentId: string,
        changeInInvesmentValue: number
    ): Promise<number> {
        const investmentRepo = manager.getRepository(Investment);
        const unitPriceRepo = manager.getRepository(InvestmentUnitPriceHistory);

        const investment = await investmentRepo.findOne(investmentId);

        const unitPriceChange = currency.divide(changeInInvesmentValue, investment.totalUnits, 14);
        const previous = await unitPriceRepo.findOne({
            where: { investmentId: investmentId },
            order: { createdOn: 'DESC' }
        });

        const unitPrice = currency.add(previous.closePrice, unitPriceChange, 14);

        await unitPriceRepo.save(
            unitPriceRepo.create({
                investmentId: investmentId,
                closePrice: unitPrice,
                closePriceAsOf: new Date(),
                previousPrice: previous.closePrice,
                totalUnits: investment.totalUnits
            })
        );
        return unitPrice;
    },

    async updatePoolHoldingsForFund(manager: EntityManager, fundId: string) {
        console.log('Updating pool holdings');
        const investmentRepo = manager.getRepository(Investment);
        const fundInvestmentRepo = manager.getRepository(FundInvestment);
        const poolHoldingRepo = manager.getRepository(PoolInvestmentHolding);
        // Get pool investments
        // const investments = await investmentRepo
        //     .createQueryBuilder('investment')
        //     .innerJoin('investment.fundAllocations', 'fundAllocations')
        //     .innerJoin('fundAllocations.fund', 'fund')
        //     .where('investment.investmentType = :investmentType', {
        //         investmentType: InvestmentType.POOL
        //     })
        //     .andWhere('fund.id = :fundId', { fundId: fundId })
        //     .getMany();
        const fundInvestments = await fundInvestmentRepo
            .createQueryBuilder('fundInvestment')
            .innerJoin('fundInvestment.fund', 'fund')
            .innerJoin('fundInvestment.investment', 'investment')
            .where('investment.investmentType = :investmentType', {
                investmentType: InvestmentType.POOL
            })
            .andWhere('fund.id = :fundId', { fundId: fundId })
            .getMany();
        const poolInvestmentIds = fundInvestments.map(i => `'${i.id}'`).join(',');
        const unitPrices = await this.getCurrentUnitPrices();

        // return early if we can't find investments
        if (!poolInvestmentIds.length) {
            console.error(
                `ERROR: no 'poolInvestmentIds' in 'updatePoolHoldingsForFund' for fund: "${fundId}"`
            );
            return;
        }

        // Create holding records for pools for today
        const latestHoldingIds = await poolHoldingRepo.query(`
            SELECT "pool_investment_holding"."id"
            FROM "pool_investment_holding"
            JOIN "fund_investment" "fi"
                ON "pool_investment_holding"."fund_investment_id" = "fi"."id"
            JOIN (
                SELECT "fund_investment_id", MAX("date") AS "date"
                FROM "pool_investment_holding"
                GROUP BY "fund_investment_id"
            ) "latest_holding"
                ON "pool_investment_holding"."date" = "latest_holding"."date"
                AND "pool_investment_holding"."fund_investment_id" = "latest_holding"."fund_investment_id"
                WHERE "pool_investment_holding"."fund_investment_id" IN (${poolInvestmentIds});
        `);
        const latestHoldings = await poolHoldingRepo.findByIds(
            latestHoldingIds.map(result => result['id']),
            { relations: ['fundInvestment'] }
        );

        const startOfToday = dayjs()
            .startOf('day')
            .toDate();

        const inserts: PoolInvestmentHolding[] = [];
        const updates: Promise<UpdateResult>[] = [];

        latestHoldings.forEach(holding => {
            const currentUnitPrice = unitPrices[holding.fundInvestment.investmentId].price;
            const currentUnitPriceAsOf = unitPrices[holding.fundInvestment.investmentId].priceAsOf;
            const costAndGainData = calculateHoldingCostAndGains(
                holding.units,
                currentUnitPrice,
                holding
            );
            const marketValue = currency.multiply(holding.units, currentUnitPrice, 14);
            if (holding.date < startOfToday) {
                inserts.push(
                    poolHoldingRepo.create({
                        date: new Date(),
                        units: holding.units,
                        marketValue: marketValue,
                        unitPrice: currentUnitPrice,
                        priceAsOf: currentUnitPriceAsOf,
                        fundInvestmentId: holding.fundInvestmentId,
                        costBasis: costAndGainData.costBasis,
                        cumulativeAverageCost: costAndGainData.cumulativeAverageCost,
                        cumulativeRealized: costAndGainData.cumulativeRealized,
                        cumulativeUnrealized: costAndGainData.cumulativeUnrealized
                    })
                );
            } else {
                updates.push(
                    poolHoldingRepo.update(holding.id, {
                        units: holding.units,
                        marketValue: marketValue,
                        date: new Date(),
                        unitPrice: currentUnitPrice,
                        priceAsOf: currentUnitPriceAsOf,
                        cumulativeAverageCost: costAndGainData.cumulativeAverageCost,
                        cumulativeRealized: costAndGainData.cumulativeRealized,
                        cumulativeUnrealized: costAndGainData.cumulativeUnrealized
                    })
                );
            }
        });

        console.log('updatePoolHoldingsForFund', {
            insertLength: inserts.length,
            updateLength: updates.length
        });

        // bulk insert
        try {
            await poolHoldingRepo.save(inserts, { chunk: 1000, transaction: false });
        } catch (error) {
            console.error('error creating pool holdings', error);
        }
        // bulk updates
        try {
            await Promise.all(updates);
        } catch (error) {
            console.error('error updating pool holdings', error);
        }

        console.log('Stored pool holdings');
    },

    async updatePoolHoldings(manager: EntityManager, investmentId: string) {
        const poolHoldingRepo = manager.getRepository(PoolInvestmentHolding);
        const unitPriceRepo = manager.getRepository(InvestmentUnitPriceHistory);
        const currentUnitPriceRecord = await unitPriceRepo.findOne({
            where: { investmentId: investmentId },
            order: { createdOn: 'DESC' }
        });
        const currentUnitPrice = currentUnitPriceRecord.closePrice;
        const currentUnitPriceAsOf = currentUnitPriceRecord.closePriceAsOf;

        // Create holding records for pools for today
        const latestHoldingIds = await poolHoldingRepo.query(`
            SELECT "pool_investment_holding"."id"
            FROM "pool_investment_holding"
            JOIN "fund_investment" "fi"
                ON "pool_investment_holding"."fund_investment_id" = "fi"."id"
            JOIN (
                SELECT "fund_investment_id", MAX("date") AS "date"
                FROM "pool_investment_holding"
                GROUP BY "fund_investment_id"
            ) "latest_holding"
                ON "pool_investment_holding"."date" = "latest_holding"."date"
                AND "pool_investment_holding"."fund_investment_id" = "latest_holding"."fund_investment_id"
                WHERE "fi"."investment_id" = '${investmentId}';
        `);
        const latestHoldings = await poolHoldingRepo.findByIds(
            latestHoldingIds.map(result => result['id']),
            { relations: ['fundInvestment'] }
        );

        const startOfToday = dayjs()
            .startOf('day')
            .toDate();

        const inserts: PoolInvestmentHolding[] = [];
        const updates: Promise<UpdateResult>[] = [];

        latestHoldings.forEach(holding => {
            const costAndGainData = calculateHoldingCostAndGains(
                holding.units,
                currentUnitPrice,
                holding
            );
            const marketValue = currency.multiply(holding.units, currentUnitPrice, 14);
            if (holding.date < startOfToday) {
                inserts.push(
                    poolHoldingRepo.create({
                        date: new Date(),
                        priceAsOf: currentUnitPriceAsOf,
                        units: holding.units,
                        marketValue: marketValue,
                        unitPrice: currentUnitPrice,
                        fundInvestmentId: holding.fundInvestmentId,
                        costBasis: costAndGainData.costBasis,
                        cumulativeAverageCost: costAndGainData.cumulativeAverageCost,
                        cumulativeRealized: costAndGainData.cumulativeRealized,
                        cumulativeUnrealized: costAndGainData.cumulativeUnrealized,
                        payable: holding.payable,
                        receivable: holding.receivable
                    })
                );
            } else {
                updates.push(
                    poolHoldingRepo.update(holding.id, {
                        units: holding.units,
                        marketValue: marketValue,
                        date: new Date(),
                        priceAsOf: currentUnitPriceAsOf,
                        unitPrice: currentUnitPrice,
                        cumulativeAverageCost: costAndGainData.cumulativeAverageCost,
                        cumulativeRealized: costAndGainData.cumulativeRealized,
                        cumulativeUnrealized: costAndGainData.cumulativeUnrealized
                    })
                );
            }
        });
        console.log('updatePoolHoldings', {
            insertLength: inserts.length,
            updateLength: updates.length
        });

        // bulk insert
        try {
            await poolHoldingRepo.save(inserts, { chunk: 1000, transaction: false });
        } catch (error) {
            console.error('error creating pool holdings', error);
        }
        // bulk updates
        try {
            await Promise.all(updates);
        } catch (error) {
            console.error('error updating pool holdings', error);
        }
    },

    async updateSharedStockHolding(
        manager: EntityManager,
        fundId: string,
        securityId: string,
        units: number,
        unitPrice: number
    ) {
        const poolHoldingRepo = manager.getCustomRepository(PoolInvestmentHoldingRepository);
        const fundInvestmentRepo = manager.getCustomRepository(FundInvestmentRepository);
        const securityRepo = manager.getCustomRepository(SecurityRepository);

        const fundInvestment = await fundInvestmentRepo.getStockInvestmentForFund(fundId);

        const valueChange = currency.multiply(units, unitPrice, 14);

        if (securityId === 'CASH') {
            const security = await securityRepo.getCashBalanceSecurityForAccount(
                fundInvestment.investment.institutionAccountId
            );
            securityId = security.id;
        }

        const currentHolding = await poolHoldingRepo.getCurrentPoolHoldingByFundInvestmentAndSecurity(
            fundInvestment.id,
            securityId
        );

        const startOfToday = dayjs()
            .startOf('day')
            .toDate();

        if (!currentHolding) {
            await poolHoldingRepo.save(
                poolHoldingRepo.create({
                    date: new Date(),
                    units: units,
                    marketValue: valueChange,
                    unitPrice: unitPrice,
                    fundInvestmentId: fundInvestment.id,
                    cumulativeAverageCost: unitPrice,
                    cumulativeRealized: 0,
                    cumulativeUnrealized: 0,
                    securityId: securityId
                })
            );
        } else {
            const newUnits = currency.add(currentHolding.units, units, 14);
            const newValueChange = currency.multiply(newUnits, unitPrice, 14);

            const {
                cumulativeAverageCost,
                cumulativeUnrealized,
                cumulativeRealized
            } = calculateHoldingCostAndGains(newUnits, unitPrice, currentHolding);
            if (currentHolding.date < startOfToday) {
                await poolHoldingRepo.save(
                    poolHoldingRepo.create({
                        date: new Date(),
                        units: newUnits,
                        marketValue: newValueChange,
                        unitPrice: unitPrice,
                        fundInvestmentId: fundInvestment.id,
                        cumulativeAverageCost: cumulativeAverageCost,
                        cumulativeRealized: cumulativeRealized,
                        cumulativeUnrealized: cumulativeUnrealized,
                        securityId: securityId
                    })
                );
            } else {
                await poolHoldingRepo.update(currentHolding.id, {
                    units: newUnits,
                    marketValue: newValueChange,
                    date: new Date(),
                    unitPrice: unitPrice,
                    cumulativeAverageCost: cumulativeAverageCost,
                    cumulativeRealized: cumulativeRealized,
                    cumulativeUnrealized: cumulativeUnrealized
                });
            }
        }
    },

    async updateSharedStockCashHoldingByFundInvestment(
        manager: EntityManager,
        fundInvestmentId: string,
        valueChange: number,
        payableChange = 0,
        receivableChange = 0
    ) {
        const poolHoldingRepo = manager.getCustomRepository(PoolInvestmentHoldingRepository);
        const fundInvestmentRepo = manager.getCustomRepository(FundInvestmentRepository);
        const securityRepo = manager.getCustomRepository(SecurityRepository);

        const fundInvestment = await fundInvestmentRepo.findOne(fundInvestmentId, {
            relations: ['investment']
        });

        const security = await securityRepo.getCashBalanceSecurityForAccount(
            fundInvestment.investment.institutionAccountId
        );

        const currentHolding = await poolHoldingRepo.getCurrentPoolHoldingByFundInvestmentAndSecurity(
            fundInvestment.id,
            security.id
        );

        const startOfToday = dayjs()
            .startOf('day')
            .toDate();

        if (!currentHolding) {
            await poolHoldingRepo.save(
                poolHoldingRepo.create({
                    date: new Date(),
                    units: valueChange,
                    marketValue: valueChange,
                    unitPrice: 1,
                    fundInvestmentId: fundInvestment.id,
                    cumulativeAverageCost: 1,
                    cumulativeRealized: 0,
                    cumulativeUnrealized: 0,
                    securityId: security.id,
                    payable: payableChange,
                    receivable: receivableChange
                })
            );
        } else {
            const newValue = currency.add(currentHolding.marketValue, valueChange, 14);
            const payable = currency.add(currentHolding.payable, payableChange, 14);
            const receivable = currency.add(currentHolding.receivable, receivableChange, 14);

            if (currentHolding.date < startOfToday) {
                await poolHoldingRepo.save(
                    poolHoldingRepo.create({
                        date: new Date(),
                        units: newValue,
                        marketValue: newValue,
                        unitPrice: 1,
                        fundInvestmentId: fundInvestment.id,
                        cumulativeAverageCost: 1,
                        cumulativeRealized: 0,
                        cumulativeUnrealized: 0,
                        securityId: security.id,
                        payable: payable,
                        receivable: receivable
                    })
                );
            } else {
                await poolHoldingRepo.update(currentHolding.id, {
                    units: newValue,
                    marketValue: newValue,
                    date: new Date(),
                    unitPrice: 1,
                    cumulativeAverageCost: 1,
                    cumulativeRealized: 0,
                    cumulativeUnrealized: 0,
                    payable: payable,
                    receivable: receivable
                });
            }
        }
    },

    async updateCashHoldingByFundInvestment(
        manager: EntityManager, // Passing manager to do these operations in one DB transaction
        fundInvestmentId: string,
        valueChange: number,
        payableChange = 0,
        receivableChange = 0
    ) {
        const fundInvestment = await manager
            .getRepository(FundInvestment)
            .findOne(fundInvestmentId, { relations: ['investment'] });
        if (fundInvestment.investment.investmentType === InvestmentType.SHARED_STOCK) {
            return await this.updateSharedStockCashHoldingByFundInvestment(
                fundInvestmentId,
                valueChange,
                payableChange,
                receivableChange,
                manager
            );
        }
        const poolHoldingRepo = manager.getCustomRepository(PoolInvestmentHoldingRepository);
        const currentHolding = await poolHoldingRepo.getCurrentPoolHoldingByFundInvestment(
            fundInvestmentId
        );

        const startOfToday = dayjs()
            .startOf('day')
            .toDate();

        if (!currentHolding) {
            const amount = valueChange;
            await poolHoldingRepo.save(
                poolHoldingRepo.create({
                    date: new Date(),
                    units: amount,
                    marketValue: amount,
                    unitPrice: 1,
                    fundInvestmentId: fundInvestmentId,
                    cumulativeAverageCost: 0,
                    cumulativeRealized: 0,
                    cumulativeUnrealized: 0,
                    payable: payableChange,
                    receivable: receivableChange
                })
            );
        } else {
            const amount = currency.add(currentHolding.marketValue, valueChange, 14);
            const payable = currency.add(currentHolding.payable, payableChange, 14);
            const receivable = currency.add(currentHolding.receivable, receivableChange, 14);
            if (currentHolding.date < startOfToday) {
                await poolHoldingRepo.save(
                    poolHoldingRepo.create({
                        date: new Date(),
                        units: amount,
                        marketValue: amount,
                        unitPrice: 1,
                        fundInvestmentId: fundInvestmentId,
                        cumulativeAverageCost: 0,
                        cumulativeRealized: 0,
                        cumulativeUnrealized: 0,
                        payable: payable,
                        receivable: receivable
                    })
                );
            } else {
                await poolHoldingRepo.update(currentHolding.id, {
                    units: amount,
                    marketValue: amount,
                    date: new Date(),
                    payable: payable,
                    receivable: receivable
                });
            }
        }
    },

    async updatePoolHoldingByFundInvestment(
        fundInvestmentId: string,
        unitChange: number,
        payableChange = 0,
        receivableChange = 0,
        manager: EntityManager // Passing manager to do these operations in one DB transaction
    ) {
        const poolHoldingRepo = manager.getCustomRepository(PoolInvestmentHoldingRepository);
        const fundInvestmentRepo = manager.getCustomRepository(FundInvestmentRepository);
        const investmentRepo = manager.getRepository(Investment);
        const investmentPriceRepo = manager.getRepository(InvestmentUnitPriceHistory);

        const fundInvestment = await fundInvestmentRepo.findOne(fundInvestmentId, {
            relations: ['investment']
        });
        let unitPrice = 1; // Assume cash account in case payable or receivable is being updated
        if (fundInvestment.investment.investmentType == InvestmentType.POOL) {
            // Load unit price if pool
            const latestPrice = await investmentPriceRepo.findOne({
                where: { investmentId: fundInvestment.investmentId },
                order: { createdOn: 'DESC' }
            });
            unitPrice = latestPrice.closePrice;
        }
        const valueChange = currency.multiply(unitPrice, unitChange, 14);
        const currentHolding = await poolHoldingRepo.getCurrentPoolHoldingByFundInvestment(
            fundInvestmentId
        );
        const startOfToday = dayjs()
            .startOf('day')
            .toDate();

        if (!currentHolding) {
            await poolHoldingRepo.save(
                poolHoldingRepo.create({
                    date: new Date(),
                    units: unitChange,
                    marketValue: valueChange,
                    unitPrice: unitPrice,
                    fundInvestmentId: fundInvestmentId,
                    cumulativeAverageCost: unitPrice,
                    cumulativeRealized: 0,
                    cumulativeUnrealized: 0,
                    payable: payableChange,
                    receivable: receivableChange
                })
            );
        } else {
            const newUnits = currency.add(currentHolding.units, unitChange, 14);
            const marketValue = currency.add(currentHolding.marketValue, valueChange, 14);
            const payable = currency.add(currentHolding.payable, payableChange, 14);
            const receivable = currency.add(currentHolding.receivable, receivableChange, 14);
            const {
                cumulativeAverageCost,
                cumulativeUnrealized,
                cumulativeRealized
            } = calculateHoldingCostAndGains(newUnits, unitPrice, currentHolding);
            if (currentHolding.date < startOfToday) {
                await poolHoldingRepo.save(
                    poolHoldingRepo.create({
                        date: new Date(),
                        units: newUnits,
                        marketValue: marketValue,
                        unitPrice: unitPrice,
                        fundInvestmentId: fundInvestment.id,
                        cumulativeAverageCost: cumulativeAverageCost,
                        cumulativeRealized: cumulativeRealized,
                        cumulativeUnrealized: cumulativeUnrealized,
                        payable: payable,
                        receivable: receivable
                    })
                );
            } else {
                await poolHoldingRepo.update(currentHolding.id, {
                    units: newUnits,
                    marketValue: marketValue,
                    date: new Date(),
                    unitPrice: unitPrice,
                    cumulativeAverageCost: cumulativeAverageCost,
                    cumulativeRealized: cumulativeRealized,
                    cumulativeUnrealized: cumulativeUnrealized,
                    payable: payable,
                    receivable: receivable
                });
            }
        }
    }
};
