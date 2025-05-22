import { getOrCreateConnection } from '../../typeorm';
import { Holding, PoolInvestmentHolding } from '../../models';
import { calculateHoldingCostAndGains } from '../../utilities/calculateHoldingCostAndGains';

// Seeds cost basis, average cost, and realized and unrealized gains for existing holding records
export async function seedHoldingCostBasis() {
    const connection = await getOrCreateConnection({ logging: true });
    const holdingRepo = connection.getRepository(Holding);
    const poolHoldingRepo = connection.getRepository(PoolInvestmentHolding);

    async function seedIMAHoldingCostBasis() {
        // Get first record we have for each holding (one with earliest date)
        const initialHoldingRecords = await holdingRepo.query(`
        SELECT "holding".*
        FROM "holding"
        JOIN (
            SELECT "holding_id", MIN("date") AS "date"
            FROM "holding"
            GROUP BY "holding_id"
        ) "initial_holding"
            ON "holding"."date" = "initial_holding"."date"
            AND "holding"."holding_id" = "initial_holding"."holding_id";
    `);
        let count = 0;
        for (const initialHolding of initialHoldingRecords) {
            count++;
            // Calculate initial cost based on the units and total value
            const costBasis = initialHolding['unit_price'];
            const cumulativeAverageCost = costBasis;
            const cumulativeRealized = 0;
            const cumulativeUnrealized = 0;

            await holdingRepo.update(initialHolding.id, {
                costBasis: costBasis,
                cumulativeAverageCost: costBasis,
                cumulativeRealized: 0,
                cumulativeUnrealized: 0
            });

            // Update calculate subsequent holdings' cost basis and cumulative gains/losses
            const holdings = await holdingRepo
                .createQueryBuilder('holding')
                .where('holding.holdingId = :holdingId', {
                    holdingId: initialHolding['holding_id']
                })
                .orderBy('holding.date', 'ASC')
                .getMany();

            // Start at 1 to skip the initial holding we just updated
            // Process new values for each holding, based on the previous holding
            await holdingRepo.manager.transaction(async manager => {
                for (let i = 1; i < holdings.length; i++) {
                    const currentHolding = holdings[i];
                    const previousHolding = holdings[i - 1];

                    const result = calculateHoldingCostAndGains(
                        currentHolding.units,
                        currentHolding.unitPrice,
                        previousHolding
                    );

                    await manager.update(Holding, currentHolding.id, result);
                    // Copy values into object reference
                    for (const prop in result) {
                        currentHolding[prop] = result[prop];
                    }
                }
            });
            console.log(
                `${count} of ${initialHoldingRecords.length} - Updating cost basis for holding: ${initialHolding.holding_id} - ${initialHolding.name}`
            );
        }
    }

    async function seedPoolHoldingCostBasis() {
        // Get first record we have for each holding (one with earliest date)
        const initialHoldingRecords = await poolHoldingRepo.query(`
        SELECT "pool_investment_holding".*
        FROM "pool_investment_holding"
        JOIN (
            SELECT "fund_investment_id", MIN("date") AS "date"
            FROM "pool_investment_holding"
            GROUP BY "fund_investment_id"
        ) "initial_holding"
            ON "pool_investment_holding"."date" = "initial_holding"."date"
            AND "pool_investment_holding"."fund_investment_id" = "initial_holding"."fund_investment_id";
        `);
        let count = 0;
        for (const initialHolding of initialHoldingRecords) {
            count++;
            // Calculate initial cost based on the units and total value
            const costBasis = initialHolding['unit_price'];
            const cumulativeAverageCost = costBasis;
            const cumulativeRealized = 0;
            const cumulativeUnrealized = 0;

            await poolHoldingRepo.update(initialHolding.id, {
                costBasis: costBasis,
                cumulativeAverageCost: cumulativeAverageCost,
                cumulativeRealized: cumulativeRealized,
                cumulativeUnrealized: cumulativeUnrealized
            });

            // Update calculate subsequent holdings' cost basis and cumulative gains/losses
            const holdings = await poolHoldingRepo
                .createQueryBuilder('poolInvestmentHolding')
                .where('poolInvestmentHolding.fundInvestmentId = :holdingId', {
                    holdingId: initialHolding['fund_investment_id']
                })
                .orderBy('poolInvestmentHolding.date', 'ASC')
                .getMany();

            // Start at 1 to skip the initial holding we just updated
            // Process new values for each holding, based on the previous holding
            await poolHoldingRepo.manager.transaction(async manager => {
                for (let i = 1; i < holdings.length; i++) {
                    const currentHolding = holdings[i];
                    const previousHolding = holdings[i - 1];

                    const result = calculateHoldingCostAndGains(
                        currentHolding.units,
                        currentHolding.unitPrice,
                        previousHolding
                    );

                    await manager.update(PoolInvestmentHolding, currentHolding.id, result);
                    // Copy values into object reference
                    for (const prop in result) {
                        currentHolding[prop] = result[prop];
                    }
                }
            });
            console.log(
                `${count} of ${initialHoldingRecords.length} - Updating cost basis for pool holding: ${initialHolding.fund_investment_id}`
            );
        }
    }
    await seedIMAHoldingCostBasis();
    await seedPoolHoldingCostBasis();
    process.exit();
}
seedHoldingCostBasis()
