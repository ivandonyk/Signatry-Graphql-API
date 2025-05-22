import _ from 'lodash';

import { GLAccountReconciliation } from '../models/GLAccountReconciliation';
import { UtilityResolver } from './core/UtilityResolver';
import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { PermissionLock } from '../decorators/permissionDecorator';
import { GraphQLContext } from '../context';
import {
    Batch,
    Fund,
    FundInvestment,
    InstitutionAccount,
    InstitutionAccountTransaction,
    ReconciliationCountResults,
    ReconciliationResults,
    ReconciliationHistory,
    TenantAccount,
    GLAccountReconciliationView
} from '../models';
import { InvestmentType } from '../models/Investment';
import { ReconciliationStatus } from '../inputs/Reconciliation/ReconciliationStatus';
import { ReconciliationType } from '../inputs/Reconciliation/ReconciliationType';
import { ReconciliationOrderBy } from '../inputs/Reconciliation/ReconciliationOrderBy';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { MatchedTransactionInput } from '../inputs/Reconciliation/PostTransactionsInput';
import { InstitutionAccountTransactionRepository } from '../repositories/InstitutionAccountTransaction';
import { ReconciliationHistoryAction } from '../models/ReconcilliationHistory';
import { currency } from '../utilities/currency';
import {
    processReconciledTransactions,
    reconciliationSubmitted
} from '../utilities/reconciliation';

@Resolver(type => GLAccountReconciliation)
export class ReconciliationResolver extends UtilityResolver {
    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.READ)
    @Query(type => ReconciliationCountResults)
    async getReconciliationCountByStatus(
        @Ctx() context: GraphQLContext,
        @Arg('status', type => ReconciliationStatus, { nullable: true })
        status?: ReconciliationStatus
    ): Promise<ReconciliationCountResults> {
        const internalCount = await this.getReconciledCountByTypeAndStatus(
            context,
            ReconciliationType.INTERNAL,
            status
        );
        const imaCount = await this.getReconciledCountByTypeAndStatus(
            context,
            ReconciliationType.IMA,
            status
        );

        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        return {
            timestamp,
            internalCount,
            imaCount
        };
    }

    async getReconciledCountByTypeAndStatus(
        context: GraphQLContext,
        type: ReconciliationType,
        status: ReconciliationStatus
    ): Promise<number> {
        const query = this.getActiveReconciliationQueryList(context, type);
        if (status) {
            const reconciledAccountOperator = ReconciliationStatus.UNRECONCILED ? '!=' : '=';
            query.andWhere(
                `glAccountReconciliationView.unreconciledCount ${reconciledAccountOperator} 0`
            );
        }
        return await query.getCount();
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.READ)
    @Query(type => ReconciliationResults)
    async getReconciliation(
        @Ctx() context: GraphQLContext,
        @Arg('type', type => ReconciliationType, { nullable: false }) type: ReconciliationType,
        @Arg('orderBy', { nullable: true }) orderBy?: ReconciliationOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('search', { nullable: true }) search?: string
    ): Promise<ReconciliationResults> {
        const query = this.getActiveReconciliationQueryList(
            context,
            type,
            orderBy,
            skip,
            take,
            search
        );
        const [data, count] = await query.getManyAndCount();

        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        return {
            timestamp,
            data: data,
            count: count
        };
    }

    getRelationsReconciliationByIdQuery(repo: Repository<GLAccountReconciliation>) {
        const query = repo
            .createQueryBuilder('entity')
            .innerJoinAndSelect('entity.glAccount', 'glAccount')
            .leftJoinAndSelect('glAccount.accountTypes', 'accountTypes')
            .leftJoinAndMapOne(
                'glAccount.institutionAccount',
                InstitutionAccount,
                'institutionAccount',
                'glAccount.id = institutionAccount.glAccountId AND institutionAccount.isSweepAccount = false'
            )
            .leftJoinAndMapOne(
                'glAccount.tenantAccount',
                TenantAccount,
                'tenantAccount',
                'glAccount.id = tenantAccount.glAccountId'
            )
            .innerJoinAndSelect('glAccount.investment', 'investment')
            .where('entity.dateReconciled IS NULL'); // Active Reconciliations

        return query;
    }

    getRelationsReconciliationQuery(repo: Repository<GLAccountReconciliation>) {
        const query = this.getRelationsReconciliationByIdQuery(repo);
        query.innerJoinAndMapOne(
            'entity.glAccountReconciliationView',
            GLAccountReconciliationView,
            'glAccountReconciliationView',
            'entity.id = glAccountReconciliationView.id'
        );

        return query;
    }

    getActiveReconciliationQueryList(
        context: GraphQLContext,
        type: ReconciliationType,
        orderBy?: ReconciliationOrderBy,
        skip?: number,
        take?: number,
        search?: string
    ): SelectQueryBuilder<GLAccountReconciliation> {
        const repo = context.typeorm.getRepository(GLAccountReconciliation);

        const typeOperator = type === ReconciliationType.IMA ? '=' : '!=';
        const typeWhere = {
            query: `investment.investmentType ${typeOperator} :investmentType`,
            parameters: { investmentType: InvestmentType.IMA }
        };

        const query = this.getRelationsReconciliationQuery(repo);
        query.andWhere(typeWhere.query, typeWhere.parameters);

        if (orderBy && (orderBy.change || orderBy.unreconciledCount)) {
            this.addOrderBy(
                repo,
                query,
                repo.metadata.ownRelations,
                orderBy,
                'glAccountReconciliationView'
            );
        } else {
            this.addOrderBy(repo, query, repo.metadata.ownRelations, orderBy);
        }

        if (search) {
            const processedSearch = search
                .replace(/[^a-zA-Z0-9\s]/g, ' ')
                .split(' ')
                .filter(s => s.length)
                .map(s => `${s.trim()}:*`)
                .join([' ', '|', ' '].join(''));
            // Add rank
            query.addSelect('ts_rank_cd(entity.search_vector, :processedSearch, 1)', 'rank');
            // Order by rank
            query.addOrderBy('rank', 'DESC');
            // tsvector search
            query.andWhere("entity.search_vector @@ to_tsquery('simple', :processedSearch)", {
                processedSearch
            });
        }

        if (type === ReconciliationType.IMA) {
            query.innerJoinAndMapOne(
                'entity.fundInvestment',
                FundInvestment,
                'fundInvestment',
                'investment.id = fundInvestment.investmentId'
            );
            query.innerJoinAndMapOne(
                'entity.fund',
                Fund,
                'fund',
                'fundInvestment.fundId = fund.id'
            );
        }
        if (skip) query.skip(skip);
        if (take) query.take(take);

        return query;
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.READ)
    @Query(type => GLAccountReconciliation)
    async getReconciliationByGlAccountId(
        @Ctx() context: GraphQLContext,
        @Arg('id', type => String) id: string
    ): Promise<GLAccountReconciliation> {
        const repo = await context.typeorm.manager.getRepository(GLAccountReconciliation);
        const query = this.getRelationsReconciliationByIdQuery(repo);
        const reconciliation = await query
            .andWhere('glAccount.id = :glAccountId', { glAccountId: id })
            .getOne();

        if (!reconciliation) throw new Error('Unable to find Reconciliation with specified id');
        return reconciliation;
    }

    private async getReconciliationById(
        @Ctx() context: GraphQLContext,
        @Arg('id', type => String) id: string
    ): Promise<GLAccountReconciliation> {
        const repo = await context.typeorm.manager.getRepository(GLAccountReconciliation);
        const query = this.getRelationsReconciliationByIdQuery(repo);
        const reconciliation = await query.andWhereInIds(id).getOne();

        if (!reconciliation) throw new Error('Unable to find Reconciliation with specified id');

        console.log('reconciliation.resolver : Reconciliation found : ' + reconciliation.id);
        return reconciliation;
    }

    async postTransactions(
        context: GraphQLContext,
        reconciliationId: string,
        matchedTransactions: MatchedTransactionInput[]
    ) {
        await context.joinTransaction('postTransactions', async (manager, tranContext) => {
            const userProfile = await this.getCurrentUserProfile(context);
            const transactionRepo = manager.getCustomRepository(
                InstitutionAccountTransactionRepository
            );
            const batchRepo = manager.getRepository(Batch);

            // break into separate arrays
            const { institutionAccountTransactionIds, batchIds } = matchedTransactions.reduce(
                (acc, current) => {
                    acc.institutionAccountTransactionIds.push(
                        current.institutionAccountTransactionId
                    );
                    acc.batchIds.push(current.batchId);
                    return acc;
                },
                { institutionAccountTransactionIds: [], batchIds: [] }
            );

            // get data
            const [reconciliation, transactions, batches] = await Promise.all([
                this.getReconciliationById(context, reconciliationId),
                transactionRepo.findByIds(institutionAccountTransactionIds, {
                    relations: ['institutionAccount']
                }),
                manager
                    .getRepository(Batch)
                    .createQueryBuilder('entity')
                    .leftJoinAndSelect('entity.transactions', 'transactions')
                    .leftJoinAndSelect('transactions.fundTransaction', 'fundTransaction')
                    .leftJoinAndSelect(
                        'transactions.transactionDetailType',
                        'transactionDetailType'
                    )
                    .where('entity.id IN (:...batchIds)', { batchIds: batchIds })
                    .getMany()
            ]);

            const batchMap = [];
            const matchErrors = [];
            transactions.forEach(transaction => {
                const batchIdForTransaction = matchedTransactions.find(
                    mt => mt.institutionAccountTransactionId === transaction.id
                ).batchId;

                // double check that transaction and batch can be matched
                const batchForTransaction = batches.find(b => b.id === batchIdForTransaction);
                const canMatch = transaction.canBeMatchedWith(batchForTransaction);
                if (canMatch) {
                    tranContext.log(
                        'transactions can be matched : ' +
                            JSON.stringify({
                                institutionAccountTransaction: transaction.transactionId,
                                batch: batchForTransaction.batchCode
                            })
                    );
                    batchMap.push({ transaction: transaction, batch: batchForTransaction });
                } else {
                    tranContext.log('reconciliation.resolver : transactions cannot be matched');
                    matchErrors.push({ transaction: transaction, batch: batchForTransaction });
                }
            });

            if (matchErrors.length > 0) {
                const errorString = matchErrors
                    .map(
                        e =>
                            `Transaction: ${e.transaction.name} $${e.transaction.amount}, Batch: ${e.batch.batchCode}`
                    )
                    .join(' | ');
                throw new Error(
                    `Unable to match some transactions. Must unmatch to proceed. - ${errorString}`
                );
            }
            for (const item of batchMap) {
                item.transaction.matchWith(item.batch, userProfile);
                await transactionRepo.save(item.transaction);
                await batchRepo.save(item.batch);
            }
            tranContext.log(
                'reconciliation.resolver : Emitting  PROCESS_RECONCILED_TRANSACTIONS start'
            );
            tranContext.log(
                'reconciliation.resolver : transactions : ' +
                    JSON.stringify(transactions.map(t => t.transactionId))
            );
            tranContext.log(
                'reconciliation.resolver : Reconciliation Id : ' + JSON.stringify(reconciliation.id)
            );

            // don't block by awaiting
            processReconciledTransactions(context, reconciliation.id, transactions);

            const sumTransactions = transactions.reduce((sum, t) => currency.add(sum, t.amount), 0);
            tranContext.log('reconciliation.resolver : sumTransactions ', sumTransactions);
            await this.createHistory(
                context,
                reconciliation,
                ReconciliationHistoryAction.POST,
                transactions.length,
                sumTransactions
            );
        });
    }

    @Mutation(type => Boolean)
    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.FULL)
    async postMatchedTransactions(
        @Ctx() context: GraphQLContext,
        @Arg('reconciliationId', type => String) reconciliationId: string,
        @Arg('matchedTransactions', type => MatchedTransactionInput)
        matchedTransactions: MatchedTransactionInput[]
    ): Promise<boolean> {
        if (matchedTransactions.length === 0) {
            return false;
        }
        // i'm guessing we call this to validate the reconciliation record exists
        await this.getReconciliationById(context, reconciliationId);

        const tranWrapper = context.assumeTransactionOwnership(
            `reconciliation.resolver.postMatchedTransactions.${reconciliationId}`,
            false,
            true
        );

        await tranWrapper.start();

        const contextState = await tranWrapper.join('postMatchedTransactions', async () => {
            await this.postTransactions(context, reconciliationId, matchedTransactions);
        });

        return !contextState.errors.length;
    }

    @Mutation(type => GLAccountReconciliation)
    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.FULL)
    async submitReconciliation(
        @Ctx() context: GraphQLContext,
        @Arg('reconciliationId', type => String) reconciliationId: string,
        @Arg('date', type => Date) date: Date,
        @Arg('matchedTransactions', type => MatchedTransactionInput)
        matchedTransactions: MatchedTransactionInput[],
        @Arg('ignoredTransactions', type => [String]) ignoredTransactions: string[]
    ): Promise<GLAccountReconciliation> {
        const reconciliation = await this.getReconciliationById(context, reconciliationId);

        if (
            !reconciliation ||
            !reconciliation.glAccount ||
            !reconciliation.glAccount.institutionAccount
        ) {
            throw new Error('Unable to find Reconciliation with specified id');
        }

        const tranWrapper = context.assumeTransactionOwnership(
            `reconciliation.resolver.submitReconciliation.${reconciliationId}`,
            false,
            true
        );

        await tranWrapper.start();

        const contextState = await tranWrapper.join('submitReconciliation', async em => {
            const reconRepo = em.getRepository(GLAccountReconciliation);
            const userProfile = await this.getCurrentUserProfile(context);
            const transactionRepo = em.getCustomRepository(InstitutionAccountTransactionRepository);
            const batchRepo = em.getRepository(Batch);

            // Post pending transactions
            if (matchedTransactions.length) {
                await this.postTransactions(context, reconciliationId, matchedTransactions);
            }

            // ignore transactions
            if (ignoredTransactions.length) {
                await em
                    .createQueryBuilder()
                    .update(InstitutionAccountTransaction)
                    .set({ isIgnored: true })
                    .where('id IN (:...ids)', { ids: ignoredTransactions })
                    .execute();
            }

            const transactions = await transactionRepo.getUnreconciledTransactions(
                reconciliation.glAccount.id,
                date
            );

            if (matchedTransactions.length > 0 && transactions.length === 0) {
                throw new Error('There is no transactions to reconcile');
            }

            // if every transaction isn't matched or ignored
            if (!transactions.every(t => Boolean(t.batch) || t.isIgnored)) {
                throw new Error('All transactions to be reconciled need to be matched');
            }

            // Check and update transactions/batches to reconcile
            await Promise.all(
                transactions.map(async transaction => {
                    transaction.reconcileTo(reconciliation, userProfile);
                    await transactionRepo.save(transaction);
                    // ignored transactions won't have a batch
                    if (transaction.batch) {
                        await batchRepo.save(transaction.batch);
                    }
                })
            );

            // Update Reconciliation
            const sumTransactions = transactions.reduce((sum, t) => currency.add(sum, t.amount), 0);
            const newReconciliation = reconciliation.reconcile(
                date,
                sumTransactions,
                userProfile.id
            );
            await reconRepo.save(reconciliation);
            await reconRepo.save(newReconciliation);

            await this.createHistory(
                context,
                reconciliation,
                ReconciliationHistoryAction.RECONCILIATION,
                transactions.length,
                sumTransactions
            );

            // don't await
            reconciliationSubmitted(context, reconciliationId);
        });

        // the transaction may not be complete, but throw the first error that may have occured in the process thus far
        if (contextState.errors.length) {
            throw new Error(contextState.errors[0]);
        }

        return await this.getReconciliationByGlAccountId(context, reconciliation.glAccount.id);
    }

    private async createHistory(
        context: GraphQLContext,
        reconciliation: GLAccountReconciliation,
        action: ReconciliationHistoryAction,
        transactionCount: number,
        totalAmount: number
    ): Promise<ReconciliationHistory> {
        let newHistory: ReconciliationHistory;

        await context.joinTransaction('createHistory', async (em, tranContext) => {
            tranContext.log('reconciliation.resolver : createHistory function started');
            const profile = await this.getCurrentUserProfile(context);

            newHistory = await em.save(
                em.create(ReconciliationHistory, {
                    action: action,
                    glAccountReconciliationId: reconciliation.id,
                    glAccountId: reconciliation.glAccount.id,
                    transactionCount: transactionCount,
                    totalAmount: totalAmount,
                    createdBy: profile.id
                })
            );
            tranContext.log(
                'reconciliation.resolver : ReconciliationHistory Created : ' +
                    JSON.stringify(newHistory)
            );
        });

        return newHistory;
    }
}
