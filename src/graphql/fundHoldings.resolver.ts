import { Resolver, Ctx, Arg, Query, Int } from 'type-graphql';
import dayjs from 'dayjs';

import { GraphQLContext } from '../context';
import { BaseResolver } from './core/BaseResolver';
import { PermissionLock } from '../decorators/permissionDecorator';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { TransactionTypeValue } from '../models/TransactionType';
import {
    Fund,
    PoolInvestmentHolding,
    FundInvestmentHolding,
    Holding,
    HoldingChangeSummary,
    FundTransaction,
    FundTransactionDetail
} from '../models';
import { FundHolding, FundHoldingsBreakdown, FundPendingDepositAndWithdrawal } from '../models/FundHolding';
import { InvestmentType } from '../models/Investment';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { FundTransactionTotals } from '../models/FundTransactionTotals';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { currency } from '../utilities/currency';
import { FundRepository } from '../repositories/Fund';
import { PoolInvestmentHoldingRepository } from '../repositories/PoolInvestmentHolding';
import { HoldingRepository } from '../repositories/Holding';
import { FundInvestmentCashHolding } from '../models/FundInvestmentHolding';
import { getFundHoldingsBreakdownSansCash } from '../utilities/fundHoldingsBreakdown';
import { FundRoleNameValues } from '../models/FundRole';
import { UtilityResolver } from './core/UtilityResolver';

@Resolver(type => FundHolding)
export class FundHoldingsResolver extends UtilityResolver {
    private async validateFundForUser(
        context: GraphQLContext,
        fundId: string,
        userProfileId: string
    ) {
        // Get the fund and its investments
        const query = await context.typeorm.manager
            .createQueryBuilder(Fund, 'fund')
            .leftJoin('fund.userProfiles', 'userProfiles')
            .leftJoinAndSelect('fund.investments', 'fundInvestments')
            .leftJoinAndSelect('fundInvestments.investment', 'investment')
            .where('fund.id = :fundId', { fundId })
            .orderBy('investment.orderNum', 'ASC');

        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        if (!userIsAuthorized) {
            query.andWhere(':userProfileId IN (userProfiles.id)', { userProfileId });
        }

        const fund = await query.getOne();

        // Error if fund not found
        if (!fund) {
            throw new Error('Fund not found');
        }

        return fund;
    }

    @Query(type => FundTransactionTotals)
    async getYTDFundBalance(
        @Ctx() context: GraphQLContext,
        @Arg('fundId', type => String, { nullable: true }) fundId: string
    ): Promise<FundTransactionTotals> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        const today = dayjs();
        const startOfYear = dayjs()
            .startOf('year')
            .format('YYYY-MM-DD');

        const fundTransactionQuery = context.typeorm
            .getRepository(FundTransaction)
            .createQueryBuilder('fundTransaction')
            .leftJoinAndSelect('fundTransaction.transactionType', 'transactionType')
            .leftJoin('fundTransaction.transactionStatus', 'transactionStatus')
            .leftJoin('fundTransaction.fund', 'fund')
            .leftJoin('fund.fundUserProfiles', 'fundUserProfiles')
            .leftJoin('fundUserProfiles.fundRole', 'fundRole')
            // YTD
            .where('fundTransaction.createdOn >= :startOfYear', { startOfYear })
            .andWhere('fundTransaction.createdOn <= :today', { today })
            .andWhere('transactionType.name IN (:...types)', {
                types: [
                    TransactionTypeValue.GRANT,
                    TransactionTypeValue.CONTRIBUTION,
                    TransactionTypeValue.TRANSFER_IN,
                    TransactionTypeValue.TRANSFER_OUT
                ]
            })
            // only completed transactions
            .andWhere('transactionStatus.name = :complete', {
                complete: TransactionStatusValue.COMPLETE
            });

        const expensesQuery = context.typeorm
            .getRepository(FundTransactionDetail)
            .createQueryBuilder('fundTransactionDetail')
            .leftJoin('fundTransactionDetail.transactionDetailType', 'transactionDetailType')
            .leftJoin('fundTransactionDetail.fundTransaction', 'fundTransaction')
            .leftJoin('fundTransaction.fund', 'fund')
            .leftJoin('fund.fundUserProfiles', 'fundUserProfiles')
            .leftJoin('fundUserProfiles.fundRole', 'fundRole')
            // YTD
            .where('fundTransactionDetail.createdOn >= :startOfYear', { startOfYear })
            .andWhere('fundTransactionDetail.createdOn <= :today', { today })
            // fees
            .andWhere('transactionDetailType.name = :fee', { fee: TransactionDetailTypeName.FEE });

        // filter by fund
        if (fundId) {
            [fundTransactionQuery, expensesQuery].forEach(query => {
                query.andWhere('fund.id = :fundId', { fundId });
            });
        }
        // filter by user's funds
        else {
            [fundTransactionQuery, expensesQuery].forEach(query => {
                query
                    .andWhere('fundUserProfiles.userProfileId = :userProfileId', {
                        userProfileId: profile.id
                    })
                    .andWhere('fundRole.name != :noAccess', {
                        noAccess: FundRoleNameValues.NO_ACCESS
                    });
            });
        }

        const [fundTransactionResults, expensesResults] = await Promise.all([
            fundTransactionQuery.getMany(),
            expensesQuery.getMany()
        ]);

        const results = {
            grants: 0,
            contributions: 0,
            transfers: 0,
            expenses: expensesResults.reduce((acc, detail) => currency.add(acc, detail.amount), 0)
        } as FundTransactionTotals;

        return fundTransactionResults.reduce((acc, fundTransaction) => {
            switch (fundTransaction.transactionType.name) {
                case TransactionTypeValue.GRANT:
                    acc.grants = currency.add(acc.grants, fundTransaction.amount);
                    break;

                case TransactionTypeValue.CONTRIBUTION:
                    acc.contributions = currency.add(acc.contributions, fundTransaction.amount);
                    break;

                case TransactionTypeValue.TRANSFER_IN:
                case TransactionTypeValue.TRANSFER_OUT:
                    acc.transfers = currency.add(acc.transfers, fundTransaction.amount);
                    break;
            }

            return acc;
        }, results);
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => HoldingChangeSummary)
    public async getHoldingChangeSummaryForFunds(
        @Ctx() context: GraphQLContext,
        @Arg('fundIds', type => [String])
        fundIds: string[],
        @Arg('startDate', type => Date)
        startDate: Date,
        @Arg('endDate', type => Date)
        endDate: Date
    ): Promise<HoldingChangeSummary> {
        const fundRepo = context.typeorm.getRepository(Fund);

        const funds = await fundRepo
            .createQueryBuilder('f')
            .leftJoinAndSelect('f.investments', 'fi')
            .leftJoinAndSelect('fi.investment', 'inv')
            .where('f.id IN (:...fundIds)', {
                fundIds
            })
            .getMany();

        const imaInvestmentIdsArr = [] as string[];
        const poolInvestmentIdsArr = [] as string[];

        funds.map(fund => {
            const imaInvestmentIds = fund.investments
                .filter(fi => fi.investment.investmentType === InvestmentType.IMA)
                .map(fi => fi.investment.id);
            imaInvestmentIdsArr.push(...imaInvestmentIds);
            const poolInvestmentIds = fund.investments
                .filter(fi => fi.investment.investmentType === InvestmentType.POOL)
                .map(fi => fi.investment.id);
            poolInvestmentIdsArr.push(...poolInvestmentIds);
        });

        const holdingRepo = context.typeorm.getRepository(Holding);
        const poolHoldingRepo = context.typeorm.getRepository(PoolInvestmentHolding);

        const startDateStartOfDay = dayjs(startDate)
            .startOf('day')
            .subtract(4, 'day')
            .format('YYYY-MM-DD HH:mm');
        const startDateEndOfDay = dayjs(startDate)
            .endOf('day')
            .format('YYYY-MM-DD HH:mm');
        const endDateStartOfDay = dayjs(endDate)
            .startOf('day')
            .subtract(4, 'day')
            .format('YYYY-MM-DD HH:mm');
        const endDateEndOfDay = dayjs(endDate)
            .endOf('day')
            .format('YYYY-MM-DD HH:mm');

        let startImaHoldings: Holding[] = [];
        let endImaHoldings: Holding[] = [];
        let startPoolHoldings: PoolInvestmentHolding[] = [];
        let endPoolHoldings: PoolInvestmentHolding[] = [];

        if (imaInvestmentIdsArr.length > 0) {
            startImaHoldings = await holdingRepo
                .createQueryBuilder('holding')
                .leftJoinAndSelect('holding.security', 'security')
                .leftJoinAndSelect('holding.institutionAccount', 'institutionAccount')
                .leftJoinAndSelect('institutionAccount.investment', 'investment')
                .where('investment.id IN (:...investmentIds)', {
                    investmentIds: imaInvestmentIdsArr
                })
                .andWhere('holding.date > :startOfDay', { startOfDay: startDateStartOfDay })
                .andWhere('holding.date < :endOfDay', { endOfDay: startDateEndOfDay })
                .orderBy('holding.holdingId', 'ASC')
                .addOrderBy('holding.date', 'DESC')
                .getMany();

            endImaHoldings = await holdingRepo
                .createQueryBuilder('holding')
                .leftJoinAndSelect('holding.security', 'security')
                .leftJoinAndSelect('holding.institutionAccount', 'institutionAccount')
                .leftJoinAndSelect('institutionAccount.investment', 'investment')
                .where('investment.id IN (:...investmentIds)', {
                    investmentIds: imaInvestmentIdsArr
                })
                .andWhere('holding.date > :startOfDay', { startOfDay: endDateStartOfDay })
                .andWhere('holding.date < :endOfDay', { endOfDay: endDateEndOfDay })
                .orderBy('holding.holdingId', 'ASC')
                .addOrderBy('holding.date', 'DESC')
                .getMany();
        }

        if (poolInvestmentIdsArr.length > 0) {
            startPoolHoldings = await poolHoldingRepo
                .createQueryBuilder('poolHolding')
                .leftJoinAndSelect('poolHolding.fundInvestment', 'fundInvestment')
                .leftJoinAndSelect('fundInvestment.investment', 'investment')
                .where('investment.id IN (:...investmentIds)', {
                    investmentIds: poolInvestmentIdsArr
                })
                .andWhere('poolHolding.date > :startOfDay', { startOfDay: startDateStartOfDay })
                .andWhere('poolHolding.date < :endOfDay', { endOfDay: startDateEndOfDay })
                .orderBy('poolHolding.fundInvestmentId', 'ASC')
                .addOrderBy('poolHolding.date', 'DESC')
                .getMany();

            endPoolHoldings = await poolHoldingRepo
                .createQueryBuilder('poolHolding')
                .leftJoinAndSelect('poolHolding.fundInvestment', 'fundInvestment')
                .leftJoinAndSelect('fundInvestment.investment', 'investment')
                .where('investment.id IN (:...investmentIds)', {
                    investmentIds: poolInvestmentIdsArr
                })
                .andWhere('poolHolding.date > :startOfDay', { startOfDay: endDateStartOfDay })
                .andWhere('poolHolding.date < :endOfDay', { endOfDay: endDateEndOfDay })
                .orderBy('poolHolding.fundInvestmentId', 'ASC')
                .addOrderBy('poolHolding.date', 'DESC')
                .getMany();
        }

        const summary = new HoldingChangeSummary(
            [...startPoolHoldings, ...startImaHoldings],
            [...endPoolHoldings, ...endImaHoldings]
        );
        return summary;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => HoldingChangeSummary)
    public async getHoldingChangeSummaryForFund(
        @Ctx() context: GraphQLContext,
        @Arg('fundId', type => String)
        fundId: string,
        @Arg('startDate', type => Date)
        startDate: Date,
        @Arg('endDate', type => Date)
        endDate: Date
    ): Promise<HoldingChangeSummary> {
        const fund = await context.typeorm.manager.findOne(
            Fund,
            {
                id: fundId
            },
            { relations: ['investments', 'investments.investment'] }
        );

        const imaInvestmentIdsArr = [] as string[];
        const poolInvestmentIdsArr = [] as string[];

        const imaInvestmentIds = fund.investments
            .filter(fi => fi.investment.investmentType === InvestmentType.IMA)
            .map(fi => fi.investment.id);
        const poolInvestmentIds = fund.investments
            .filter(fi => fi.investment.investmentType === InvestmentType.POOL)
            .map(fi => fi.investment.id);

        const holdingRepo = context.typeorm.getRepository(Holding);
        const poolHoldingRepo = context.typeorm.getRepository(PoolInvestmentHolding);

        const startDateStartOfDay = dayjs(startDate)
            .startOf('day')
            .subtract(4, 'day')
            .format('YYYY-MM-DD HH:mm');
        const startDateEndOfDay = dayjs(startDate)
            .endOf('day')
            .format('YYYY-MM-DD HH:mm');
        const endDateStartOfDay = dayjs(endDate)
            .startOf('day')
            .subtract(4, 'day')
            .format('YYYY-MM-DD HH:mm');
        const endDateEndOfDay = dayjs(endDate)
            .endOf('day')
            .format('YYYY-MM-DD HH:mm');

        let startImaHoldings: Holding[] = [];
        let endImaHoldings: Holding[] = [];
        let startPoolHoldings: PoolInvestmentHolding[] = [];
        let endPoolHoldings: PoolInvestmentHolding[] = [];

        if (imaInvestmentIds.length > 0) {
            startImaHoldings = await holdingRepo
                .createQueryBuilder('holding')
                .leftJoinAndSelect('holding.security', 'security')
                .leftJoinAndSelect('holding.institutionAccount', 'institutionAccount')
                .leftJoinAndSelect('institutionAccount.investment', 'investment')
                .where('investment.id IN (:...investmentIds)', { investmentIds: imaInvestmentIds })
                .andWhere('holding.date > :startOfDay', { startOfDay: startDateStartOfDay })
                .andWhere('holding.date < :endOfDay', { endOfDay: startDateEndOfDay })
                .orderBy('holding.holdingId', 'ASC')
                .addOrderBy('holding.date', 'DESC')
                .getMany();

            endImaHoldings = await holdingRepo
                .createQueryBuilder('holding')
                .leftJoinAndSelect('holding.security', 'security')
                .leftJoinAndSelect('holding.institutionAccount', 'institutionAccount')
                .leftJoinAndSelect('institutionAccount.investment', 'investment')
                .where('investment.id IN (:...investmentIds)', { investmentIds: imaInvestmentIds })
                .andWhere('holding.date > :startOfDay', { startOfDay: endDateStartOfDay })
                .andWhere('holding.date < :endOfDay', { endOfDay: endDateEndOfDay })
                .orderBy('holding.holdingId', 'ASC')
                .addOrderBy('holding.date', 'DESC')
                .getMany();
        }

        if (poolInvestmentIds.length > 0) {
            startPoolHoldings = await poolHoldingRepo
                .createQueryBuilder('poolHolding')
                .leftJoinAndSelect('poolHolding.fundInvestment', 'fundInvestment')
                .leftJoinAndSelect('fundInvestment.investment', 'investment')
                .where('investment.id IN (:...investmentIds)', { investmentIds: poolInvestmentIds })
                .andWhere('poolHolding.date > :startOfDay', { startOfDay: startDateStartOfDay })
                .andWhere('poolHolding.date < :endOfDay', { endOfDay: startDateEndOfDay })
                .orderBy('poolHolding.fundInvestmentId', 'ASC')
                .addOrderBy('poolHolding.date', 'DESC')
                .getMany();

            endPoolHoldings = await poolHoldingRepo
                .createQueryBuilder('poolHolding')
                .leftJoinAndSelect('poolHolding.fundInvestment', 'fundInvestment')
                .leftJoinAndSelect('fundInvestment.investment', 'investment')
                .where('investment.id IN (:...investmentIds)', { investmentIds: poolInvestmentIds })
                .andWhere('poolHolding.date > :startOfDay', { startOfDay: endDateStartOfDay })
                .andWhere('poolHolding.date < :endOfDay', { endOfDay: endDateEndOfDay })
                .orderBy('poolHolding.fundInvestmentId', 'ASC')
                .addOrderBy('poolHolding.date', 'DESC')
                .getMany();
        }

        const summary = new HoldingChangeSummary(
            [...startPoolHoldings, ...startImaHoldings],
            [...endPoolHoldings, ...endImaHoldings]
        );
        return summary;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => FundInvestmentHolding)
    async getFundHoldingsByDate(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string,
        @Arg('date', type => Date, { nullable: false }) date: Date
    ) {
        // Get current user
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        // get fund
        const fund = await this.validateFundForUser(context, fundId, profile.id);

        const pihRepo = context.typeorm.getCustomRepository(PoolInvestmentHoldingRepository);
        const holdingRepo = context.typeorm.getCustomRepository(HoldingRepository);

        // get investments
        const [pools, imas, sharedStocks, ...cashHoldings] = await Promise.all([
            pihRepo.getPoolHoldingsForFundByDate(fundId, date),
            holdingRepo.getIMAHoldingsForFundByDate(fundId, date),
            pihRepo.getSharedStockHoldingsForFundByDate(fundId, date),
            pihRepo.getContributionCashHoldingForFundByDate(fund.id, date),
            pihRepo.getGrantCashHoldingForFundByDate(fund.id, date)
        ]);

        // aggregate cash holdings
        let currentCashHolding: FundInvestmentCashHolding | void;
        if (cashHoldings.some(Boolean)) {
            const defaults = { marketValue: 0, color: '#E17EE3' };
            const aggregate = cashHoldings.reduce((acc, holding) => {
                acc.marketValue = currency.add(acc.marketValue, holding?.marketValue || 0);
                // overwrite color
                if (holding) acc.color = holding.fundInvestment.investment.visualizationColor;
                return acc;
            }, defaults);

            currentCashHolding = {
                name: 'Cash in Process',
                assetClass: 'Cash',
                date,
                marketValue: aggregate.marketValue,
                color: aggregate.color
            };
        }

        return {
            date,
            fundId,
            fundName: fund.name,
            currentCashHolding,
            sharedStocks: sharedStocks
                .sort(
                    (a, b) =>
                        a.fundInvestment.investment.orderNum - b.fundInvestment.investment.orderNum
                )
                .map(h => ({
                    investmentId: h.securityId,
                    name: h.security.name,
                    color: h.fundInvestment.investment.visualizationColor,
                    ticker:
                        (!!h.security.tickerSymbol && h.security.tickerSymbol) || h.security.name,
                    assetClass: h.security.holdings[0].assetClass,
                    marketValue: h.marketValue,
                    unitPrice: h.unitPrice,
                    units: h.units,
                    date: h.date
                })),
            pools: pools
                .sort(
                    (a, b) =>
                        a.fundInvestment.investment.orderNum - b.fundInvestment.investment.orderNum
                )
                .map(h => ({
                    investmentId: h.fundInvestment.investment.id,
                    name: h.fundInvestment.investment.name,
                    color: h.fundInvestment.investment.visualizationColor,
                    ticker: `TS-${h.fundInvestment.investment.name
                        .split(' ')
                        .map(l => l.substr(0, 1))
                        .join('')
                        .toUpperCase()}`,
                    assetClass: 'Equity',
                    marketValue: h.marketValue,
                    unitPrice: h.unitPrice,
                    units: h.units,
                    date: h.date
                })),
            imas: imas
                .map(h => ({
                    parentId: h.institutionAccount.investment.id,
                    parentName: h.institutionAccount.investment.name,
                    parentColor: h.institutionAccount.investment.visualizationColor,
                    name: h.name,
                    ticker:
                        h.security?.tickerSymbol ||
                        `TS-${h.name
                            .split(' ')
                            .map(l => l.substr(0, 1))
                            .join('')
                            .toUpperCase()}`,
                    assetClass: h.assetClass || '-',
                    marketValue: h.marketValue,
                    unitPrice: h.unitPrice,
                    units: h.units,
                    date: h.date
                }))
                .sort((a, b) => b.marketValue - a.marketValue)
        } as FundInvestmentHolding;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => FundPendingDepositAndWithdrawal)
    async getFundPendingDepositAndWithdrawal(
        @Ctx() context: GraphQLContext,
        @Arg('fundId', type => String, { nullable: true }) fundId: string,
        @Arg('skip', type => Int, { nullable: true }) skip: number,
        @Arg('take', type => Int, { nullable: true }) take: number,
    ) { 
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const fund = await this.validateFundForUser(context, fundId, profile.id);
        const fundRepo = context.typeorm.getCustomRepository(FundRepository);

        const pendingDeposits = await fundRepo.getPendingDeposits(skip, take, fund.id);
        const pendingWithdrawals = await fundRepo.getPendingWithdrawals(skip, take, fund.id);
        const pendingDepositsCount = await fundRepo.getPendingDepositsCount(fund.id);
        const pendingWithdrawalsCount = await fundRepo.getPendingWithdrawalsCount(fund.id);

        return new FundPendingDepositAndWithdrawal(
            pendingDeposits,
            pendingWithdrawals,
            pendingDepositsCount,
            pendingWithdrawalsCount,
        )
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => FundHoldingsBreakdown)
    async getFundHoldingsBreakdown(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string,
        @Arg('separateCashHoldings', type => Boolean, { nullable: true })
        separateCashHoldings = false,
        @Arg('displayNegativeValues', type => Boolean, { nullable: true })
        displayNegativeValues = false
    ) {
        // Get current user
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        const fund = await this.validateFundForUser(context, fundId, profile.id);

        const fundRepo = context.typeorm.getCustomRepository(FundRepository);
        const pihRepo = context.typeorm.getCustomRepository(PoolInvestmentHoldingRepository);
        const holdingRepo = context.typeorm.getCustomRepository(HoldingRepository);

        const currentBalance = await fundRepo.getCurrentBalance(fund);
        const pendingBalance = await fundRepo.getPendingBalance(fund);
        const availableBalance = await fundRepo.getAvailableBalance(fund);
        let totalInvestedBalance = 0;

        const calculatePercentageOfBalance = (amount: number, totalInvestedBalance: number) => {
            if (totalInvestedBalance === 0) {
                return 0;
            }
            return currency.divide(amount, totalInvestedBalance);
        };

        // get investments
        const [
            poolHoldings,
            imaHoldings,
            grantCashHolding,
            contributionCashHolding,
            sharedStockHoldings
        ] = await Promise.all([
            pihRepo.getCurrentPoolHoldingsForFund(fundId),
            holdingRepo.getCurrentIMAHoldingsForFund(fundId),
            pihRepo.getCurrentGrantCashHoldingForFund(fund.id),
            pihRepo.getCurrentContributionCashHoldingForFund(fund.id),
            pihRepo.getCurrentSharedStockHoldingsForFund(fund.id)
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
                    investmentId: id,
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

        const sharedStockValuesByInvestment = sharedStockHoldings.reduce(
            (valueByInvestment, holding) => {
                const investment = holding.fundInvestment.investment;
                const id = investment.id;
                if (!valueByInvestment.hasOwnProperty(id)) {
                    valueByInvestment[id] = {
                        investmentId: id,
                        name: investment.name,
                        visualizationColor: investment.visualizationColor,
                        value: 0,
                        valueAsOf: holding.date
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
            },
            {}
        );
        totalInvestedBalance = currency.add(
            totalInvestedBalance,
            grantCashHolding?.netValue ?? 0
        );
        totalInvestedBalance = currency.add(
            totalInvestedBalance,
            contributionCashHolding?.netValue ?? 0
        );
        const fundHoldings = [] as FundHolding[];

        if (totalInvestedBalance > 0 || displayNegativeValues) {
            for (const investmentId in poolValuesByInvestment) {
                const data = poolValuesByInvestment[investmentId];
                const percentageOfBalance = calculatePercentageOfBalance(
                    data.value,
                    totalInvestedBalance
                );
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
                const percentageOfBalance = calculatePercentageOfBalance(
                    data.value,
                    totalInvestedBalance
                );
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

            for (const investmentId in sharedStockValuesByInvestment) {
                const data = sharedStockValuesByInvestment[investmentId];
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

            if (separateCashHoldings) {
                if (contributionCashHolding) {
                    fundHoldings.push(
                        new FundHolding(
                            contributionCashHolding.fundInvestment.investment.id,
                            contributionCashHolding.fundInvestment.investment.name,
                            contributionCashHolding.marketValue,
                            contributionCashHolding.date,
                            calculatePercentageOfBalance(
                                contributionCashHolding.marketValue,
                                totalInvestedBalance
                            ),
                            contributionCashHolding.fundInvestment.investment.visualizationColor,
                            contributionCashHolding.netValue
                        )
                    );
                }
                if (grantCashHolding) {
                    fundHoldings.push(
                        new FundHolding(
                            grantCashHolding.fundInvestment.investment.id,
                            grantCashHolding.fundInvestment.investment.name,
                            grantCashHolding.marketValue,
                            grantCashHolding.date,
                            calculatePercentageOfBalance(
                                grantCashHolding.marketValue,
                                totalInvestedBalance
                            ),
                            grantCashHolding.fundInvestment.investment.visualizationColor,
                            grantCashHolding.netValue
                        )
                    );
                }
            } else {
                if(contributionCashHolding){
                    const cashValue = {
                        name: 'Cash In Progress',
                        investmentId: contributionCashHolding.fundInvestment.investment.id,
                        visualizationColor:
                            contributionCashHolding.fundInvestment.investment.visualizationColor,
                        value: currency.add(
                            grantCashHolding?.marketValue ?? 0,
                            contributionCashHolding?.marketValue ?? 0
                        ),
                        valueAsOf: contributionCashHolding.date,
                        netValue: currency.add(
                            grantCashHolding?.netValue ?? 0,
                            contributionCashHolding?.netValue ?? 0
                        )
                    };
                    fundHoldings.push(
                        new FundHolding(
                            cashValue.investmentId,
                            cashValue.name,
                            cashValue.value,
                            cashValue.valueAsOf,
                            calculatePercentageOfBalance(cashValue.value, totalInvestedBalance),
                            cashValue.visualizationColor,
                            cashValue.netValue
                        )
                    );
                }
                
            }
        }

        const [deposits, withdrawals] = await Promise.all([
            fundRepo.getAmountPendingIncoming(fund.id),
            fundRepo.getAmountPendingOutgoing(fund.id)
        ]);

        return new FundHoldingsBreakdown(
            fundHoldings,
            availableBalance,
            currentBalance,
            pendingBalance,
            totalInvestedBalance,
            { deposits, withdrawals }
        );
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => FundHoldingsBreakdown)
    async getFundHoldingsBreakdownSansCash(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string
    ) {
        // Get current user
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        const fund = await this.validateFundForUser(context, fundId, profile.id);

        return await getFundHoldingsBreakdownSansCash(fund.id, context.typeorm.manager);
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => FundHoldingsBreakdown)
    async getAggregateFundHoldingsBreakdown(
        @Ctx() context: GraphQLContext,
        @Arg('fundIds', type => [String]) fundIds: string[]
    ) {
        // Get current user
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        const fundRepo = context.typeorm.getCustomRepository(FundRepository);

        // validate
        await Promise.all(
            fundIds.map(fundId => this.validateFundForUser(context, fundId, profile.id))
        );
        // accumulate
        const fundHoldingsBreakdowns: FundHoldingsBreakdown[] = await Promise.all(
            fundIds.map(async fundId => this.getFundHoldingsBreakdown(context, fundId))
        );

        const availableBalance = fundHoldingsBreakdowns.reduce(
            (sum, breakdown) => currency.add(sum, breakdown.availableBalance),
            0
        );
        const currentBalance = fundHoldingsBreakdowns.reduce(
            (sum, breakdown) => currency.add(sum, breakdown.currentBalance),
            0
        );
        const pendingBalance = fundHoldingsBreakdowns.reduce(
            (sum, breakdown) => currency.add(sum, breakdown.pendingBalance),
            0
        );
        const totalInvestedBalance = fundHoldingsBreakdowns.reduce(
            (sum, breakdown) => currency.add(sum, breakdown.totalInvestedBalance),
            0
        );
        const activity = fundHoldingsBreakdowns.reduce(
            (acc, breakdown) => {
                acc.withdrawals = currency.add(
                    acc.withdrawals,
                    breakdown.pendingActivity.withdrawals
                );
                acc.deposits = currency.add(acc.deposits, breakdown.pendingActivity.deposits);

                return acc;
            },
            {
                withdrawals: 0,
                deposits: 0
            }
        );

        const aggregateFundHoldingsBreakdown = fundHoldingsBreakdowns.reduce(
            (valueByInvestment, breakdown) => {
                breakdown.fundHoldings.forEach(holding => {
                    const id = holding.investmentId;
                    if (!valueByInvestment.hasOwnProperty(id)) {
                        valueByInvestment[id] = {
                            investmentId: id,
                            name: holding.name,
                            visualizationColor: holding.visualizationColor,
                            value: 0,
                            valueAsOf: holding.marketValueAsOf,
                            netValue: 0
                        };
                    }
                    valueByInvestment[id].value = currency.add(
                        holding.marketValue,
                        valueByInvestment[id].value
                    );
                    valueByInvestment[id].netValue = currency.add(
                        holding.netValue,
                        valueByInvestment[id].netValue
                    );
                    if (holding.marketValueAsOf > valueByInvestment[id].valueAsOf) {
                        valueByInvestment[id].valueAsOf = holding.marketValueAsOf;
                    }
                });
                return valueByInvestment;
            },
            {}
        );

        const fundHoldings = [];
        if (totalInvestedBalance > 0) {
            for (const investmentId in aggregateFundHoldingsBreakdown) {
                const aggregateHolding = aggregateFundHoldingsBreakdown[investmentId];
                const percentageOfBalance = currency.divide(
                    aggregateHolding.value,
                    totalInvestedBalance
                );
                fundHoldings.push(
                    new FundHolding(
                        aggregateHolding.investmentId,
                        aggregateHolding.name,
                        aggregateHolding.value,
                        aggregateHolding.valueAsOf,
                        percentageOfBalance,
                        aggregateHolding.visualizationColor,
                        aggregateHolding.netValue
                    )
                );
            }
        }

        return new FundHoldingsBreakdown(
            fundHoldings,
            availableBalance,
            currentBalance,
            pendingBalance,
            totalInvestedBalance,
            activity
        );
    }
}
