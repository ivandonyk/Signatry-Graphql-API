import { currency } from './currency';
import { HoldingInterface } from '../models/interfaces/Holding';

export interface CostAndGainData {
    costBasis: number;
    cumulativeAverageCost: number;
    cumulativeUnrealized: number;
    cumulativeRealized: number;
}

export function calculateHoldingCostAndGains(
    currentUnits: number,
    currentUnitPrice: number,
    previousHolding: HoldingInterface
): CostAndGainData {
    let costBasis = 0;
    let cumulativeAverageCost = 0;
    let cumulativeUnrealized = 0;
    let cumulativeRealized = 0;
    const newUnits = currentUnits - previousHolding.units;
    if (newUnits !== 0) {
        costBasis = currentUnitPrice;
        const previousTotalValue = currency.multiply(
            previousHolding.units,
            previousHolding.cumulativeAverageCost || 1
        );
        const newUnitsTotalValue = currency.multiply(newUnits, costBasis);
        const currentTotalValue = currency.add(previousTotalValue, newUnitsTotalValue);
        if (currentUnits !== 0) {
            cumulativeAverageCost = currency.divide(currentTotalValue, currentUnits);
        } else {
            cumulativeAverageCost = previousHolding.cumulativeAverageCost;
        }
        if (newUnits < 0) {
            const priceCostDifference = currency.subtract(currentUnitPrice, cumulativeAverageCost);
            const totalDifference = currency.multiply(-1 * newUnits, priceCostDifference);
            cumulativeRealized = currency.add(previousHolding.cumulativeRealized, totalDifference);
        } else {
            cumulativeRealized = previousHolding.cumulativeRealized;
        }
    } else {
        ({ costBasis, cumulativeAverageCost, cumulativeRealized } = previousHolding);
    }
    const priceDifference = currency.subtract(currentUnitPrice, cumulativeAverageCost);
    cumulativeUnrealized = currency.multiply(priceDifference, currentUnits);

    return {
        costBasis: costBasis,
        cumulativeAverageCost: cumulativeAverageCost,
        cumulativeUnrealized: cumulativeUnrealized,
        cumulativeRealized: cumulativeRealized
    };
}

export function calculateRealizedGainForSale(
    unitsSold: number,
    unitPrice: number,
    costBasis: number
): number {
    const priceCostDifference = currency.subtract(unitPrice, costBasis);
    return currency.multiply(-1 * unitsSold, priceCostDifference);
}

export function calculateCostBasisForPurchase(
    unitsPurchased: number,
    unitPrice: number,
    unitsOwned: number,
    costBasis: number
): number {
    const totalPurchaseValue = currency.multiply(unitPrice, unitsPurchased);
    const previousTotalCost = currency.multiply(unitsOwned, costBasis);
    const newTotalValue = currency.add(totalPurchaseValue, previousTotalCost);
    return currency.divide(newTotalValue, unitsPurchased + unitsOwned);
}
