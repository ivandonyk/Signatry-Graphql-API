import { Resolver, Query, Ctx } from 'type-graphql';
import {
    FundTransactionBatch,
    FundTransactionBatchTypeValue,
    FundTransactionBatchStatusValue
} from '../models/FundTransactionBatch';
import { Investment } from '../models/Investment';
import { GraphQLContext } from '../context';
import { EntityManager } from 'typeorm';
import { BaseResolver } from './core/BaseResolver';
import { TransactionTypeValue } from '../models/TransactionType';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { FundTransaction } from '../models/FundTransaction';
import { InvestmentInstruction } from '../models';
import { PermissionLock } from '../decorators/permissionDecorator';
import { Permissions } from '../types/permissionsList';
import { FundTransactionRepository } from '../repositories/FundTransaction';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver(type => InvestmentInstruction)
export class InvestmentInstructionsResolver extends BaseResolver {
    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    @Query(type => [InvestmentInstruction], { nullable: false })
    async investmentInstructions(@Ctx() context: GraphQLContext) {
        return context.typeorm.query(
            this.buildInvestmentInstructionsQuery(
                TransactionTypeValue.CONTRIBUTION,
                TransactionStatusValue.PENDING
            )
        );
    }

    @PermissionLock(PermissionAccessType.ADMIN_DIVESTMENTS, PermissionAccessLevel.READ)
    @Query(type => [InvestmentInstruction], { nullable: false })
    async divestmentInstructions(@Ctx() context: GraphQLContext) {
        const { typeorm } = context;
        return await this.getDivestmentInstructions(typeorm.manager);
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.READ)
    @Query(type => [InvestmentInstruction], { nullable: false })
    async batchedInvestmentInstructions(@Ctx() context: GraphQLContext) {
        const batch = await context.typeorm
            .createQueryBuilder(FundTransactionBatch, 'batch')
            .where('batch.type = :type', { type: FundTransactionBatchTypeValue.INVESTMENT })
            .andWhere('batch.status = :status', { status: FundTransactionBatchStatusValue.PENDING })
            .orderBy('batch.createdOn', 'DESC')
            .getOne();

        if (batch) {
            const { id } = batch;

            return context.typeorm.query(
                this.buildInvestmentInstructionsQuery(
                    TransactionTypeValue.CONTRIBUTION,
                    TransactionStatusValue.PENDING,
                    id
                ),
                [id]
            );
        }

        return [];
    }
    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.READ)
    @Query(type => [InvestmentInstruction], { nullable: false })
    async batchedDivestmentInstructions(@Ctx() context: GraphQLContext) {
        const batch = await context.typeorm
            .createQueryBuilder(FundTransactionBatch, 'batch')
            .where('batch.type = :type', { type: FundTransactionBatchTypeValue.DIVESTMENT })
            .andWhere('batch.status = :status', { status: FundTransactionBatchStatusValue.PENDING })
            .orderBy('batch.createdOn', 'DESC')
            .getOne();

        if (batch) {
            return this.getDivestmentInstructions(context.typeorm.manager, batch.id);
        }
        return [];
    }

    private async getDivestmentInstructions(manager: EntityManager, batchId?: string) {
        const repo = manager.getCustomRepository(FundTransactionRepository);
        // get all investments
        const investments = await manager.getRepository(Investment).find({
            order: {
                orderNum: 'ASC'
            }
        });
        // get all ready for payment grant transactions
        const query = manager
            .createQueryBuilder(FundTransaction, 'fundTransaction')
            .leftJoin('fundTransaction.transactionType', 'transactionType')
            .leftJoin('fundTransaction.transactionDetails', 'transactionDetails')
            .leftJoin('transactionDetails.transactionDetailType', 'transactionDetailType')
            .leftJoin('transactionDetails.transactionDetailStatus', 'transactionDetailStatus')
            .where('transactionDetailType.name = :typeName', {
                typeName: TransactionDetailTypeName.GRANT_DIVESTMENT_CASH
            })
            .andWhere('transactionType.name = :type', { type: TransactionTypeValue.GRANT })
            .andWhere('transactionDetailStatus.name = :name', {
                name: TransactionDetailStatusValue.READY_FOR_DIVESTMENT
            });

        if (batchId) {
            query.andWhere('fundTransaction.fundTransactionBatchId = :batchId', { batchId });
        }

        const transactions = await query.getMany();

        let total = 0;

        const investmentAllocationTotals = (
            await Promise.all(
                transactions.map(transaction => {
                    return repo.getDivestmentAllocations(transaction);
                })
            )
        ).reduce((result, allocations) => {
            // sum the amounts allocated to each investment
            allocations.forEach(allocation => {
                if (!result.hasOwnProperty(allocation.name)) result[allocation.name] = 0;
                result[allocation.name] += allocation.amount;
                total += allocation.amount;
            });
            return result;
        }, {});

        const divestmentInstructions = investments.reduce((result, investment) => {
            result[investment.name] = investmentAllocationTotals[investment.name] || 0;
            return result;
        }, {});

        // convert back to arrays
        const arrayInstructions = Object.keys(divestmentInstructions).reduce((result, name) => {
            result.push({ name, amount: divestmentInstructions[name] });
            return result;
        }, []);

        // add total
        arrayInstructions.push({ name: 'Total', orderNum: null, amount: total });

        return arrayInstructions;
    }

    private buildInvestmentInstructionsQuery(
        transactionType: string,
        transactionStatus: TransactionStatusValue,
        batchId?: string
    ) {
        return /*sql*/ `
            WITH allocations as (
                SELECT
                    i.id as investment_id,
                    i.order_num,
                    COALESCE(
                        (CASE '${transactionType}'
                            WHEN 'GRANT' THEN
                                SUM(ABS(ftd.amount) * fi.divestment_percentage)
                            WHEN 'CONTRIBUTION' THEN
                                SUM(ABS(ftd.amount) * fi.allocation_percentage)
                            ELSE
                                0
                        END),
                        0
                    ) as amount
                FROM fund_transaction ft
                LEFT JOIN fund_transaction_detail ftd ON ftd.fund_transaction_id = ft.id
                LEFT JOIN transaction_status ts ON ft.transaction_status_id = ts.id
                LEFT JOIN transaction_detail_status tds ON ftd.transaction_detail_status_id = tds.id
                LEFT JOIN transaction_detail_type tdt ON ftd.transaction_detail_type_id = tdt.id
                LEFT JOIN fund f ON ft.fund_id = f.id
                LEFT JOIN fund_investment fi ON fi.fund_id = f.id
                LEFT JOIN investment i ON fi.investment_id = i.id
                LEFT JOIN transaction_type tt ON ft.transaction_type_id = tt.id
                WHERE tds.name = '${TransactionDetailStatusValue.READY_FOR_INVESTMENT}'
                AND tdt.name = '${TransactionDetailTypeName.CASH_IN}'
                AND tt.name = '${transactionType}'
                ${batchId ? 'AND ft.fund_transaction_batch_id = $1' : ''}
                GROUP BY i.id, i.order_num
            )
            SELECT
                investment.name,
                investment.order_num,
                COALESCE(allocations.amount, 0) as amount
            FROM investment
            LEFT JOIN allocations ON investment.id = allocations.investment_id
            UNION SELECT
                'Total' as name,
                null as order_num,
                COALESCE(SUM(allocations.amount), 0) as amount
            FROM allocations
            ORDER BY order_num
        `;
    }
}
