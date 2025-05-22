import {
    Fund,
    FundInvestment,
    Investment,
    InvestmentUnitPriceHistory,
    InvestmentHoldingResult
} from '../models';
import { InvestmentType } from '../models/Investment';
import { Resolver, FieldResolver, Ctx, Root, Info } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { PoolInvestmentHoldingRepository } from '../repositories/PoolInvestmentHolding';
import { HoldingRepository } from '../repositories/Holding';
import { getStartAndEndOfYesterday } from '../utilities/datetime';
import { currency } from '../utilities/currency';

@Resolver(type => FundInvestment)
export class FundInvestmentResolver extends UtilityResolver {
    @FieldResolver(type => Fund)
    public async fund(@Root() root: FundInvestment, @Ctx() context: any, @Info() info: any) {
        const temp = await context.typeorm.getRepository(Fund).findOne({
            id: root.fundId
        });
        return temp;
    }

    @FieldResolver(type => Investment)
    public async investment(@Root() root: FundInvestment, @Ctx() context: any, @Info() info: any) {
        const temp = await context.typeorm.getRepository(Investment).findOne({
            id: root.investmentId
        });
        return temp;
    }

    @FieldResolver(type => Number)
    public async amountAvailable(@Root() root: FundInvestment, @Ctx() context: GraphQLContext) {
        const poolHoldingRepo = context.typeorm.getCustomRepository(
            PoolInvestmentHoldingRepository
        );
        const holdingRepo = context.typeorm.getCustomRepository(HoldingRepository);

        const investment =
            root.investment ||
            (await context.typeorm.getRepository(Investment).findOne({ id: root.investmentId }));

        switch (investment.investmentType) {
            case InvestmentType.POOL: {
                return await poolHoldingRepo.getCurrentPoolHoldingValueByFundInvestment(root.id);
            }

            case InvestmentType.IMA: {
                return await holdingRepo.getCurrentIMAHoldingValueForFund(
                    root.fundId,
                    root.investmentId
                );
            }

            case InvestmentType.GRANT_CASH: {
                return await poolHoldingRepo.getCurrentPoolHoldingValueByFundInvestment(
                    root.fundId
                );
            }

            case InvestmentType.CONTRIBUTION_CASH: {
                return await poolHoldingRepo.getCurrentPoolHoldingValueByFundInvestment(
                    root.fundId
                );
            }

            case InvestmentType.SHARED_STOCK: {
                return await poolHoldingRepo.getCurrentSharedStockHoldingValueForFund(root.fundId);
            }
        }
    }

    @FieldResolver(type => [InvestmentHoldingResult])
    public async currentInvestmentHoldings(
        @Ctx() context: GraphQLContext,
        @Root() root: FundInvestment
    ): Promise<InvestmentHoldingResult[]> {
        let holdingResults = [];
        const investment = await context.typeorm
            .getRepository(Investment)
            .findOne(root.investmentId);
        const { startOfDay, endOfDay } = getStartAndEndOfYesterday();
        if (investment.investmentType === InvestmentType.POOL) {
            const holdingRepo = context.typeorm.getCustomRepository(
                PoolInvestmentHoldingRepository
            );
            const holding = await holdingRepo.getCurrentPoolHoldingByFundInvestment(root.id);
            return [
                {
                    name: holding.fundInvestment.investment.name,
                    marketValue: holding.marketValue,
                    date: holding.date,
                    units: holding.units,
                    unitPrice: holding.unitPrice
                }
            ];
        } else if (investment.investmentType === InvestmentType.IMA) {
            const holdingRepo = context.typeorm.getCustomRepository(HoldingRepository);
            const holdings = await holdingRepo.getCurrentIMAHoldingsForFund(
                root.fundId,
                root.investmentId
            );
            holdingResults = holdings.map(holding => {
                return {
                    name: holding.name,
                    marketValue: holding.marketValue,
                    date: holding.date,
                    units: holding.units,
                    unitPrice: holding.unitPrice
                };
            });
        }
        return holdingResults;
    }
}
