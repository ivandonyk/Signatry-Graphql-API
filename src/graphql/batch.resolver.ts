import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { Connection, EntityManager, In, Not, SelectQueryBuilder } from 'typeorm';
import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import { eventEmitter, EVENTS } from '../events';
import { AddNewTransactionsToBatchInput } from '../inputs/Batch/AddNewTransactionsToBatchInput';
import { BatchFilter } from '../inputs/Batch/BatchFilter';
import { BatchOrderBy } from '../inputs/Batch/BatchOrderBy';
import { CreateBatchInput, CreatePaymentBatchInput } from '../inputs/Batch/CreateBatchInput';
import { EditBatchInput } from '../inputs/Batch/EditBatchInput';
import { ManualBatchInput } from '../inputs/Batch/ManualBatchInput';
import { UpdateBatchInput } from '../inputs/Batch/UpdateBatchInput';
import { TransactionDetailCustomFilter } from '../inputs/FundTransactionDetail/FundTransactionDetailCustomFilter';
import {
    Batch,
    FundTransactionDetail,
    GLAccount,
    InstitutionAccount,
    InstitutionAccountTransaction,
    ProviderAccountData,
    Security,
    Tenant,
    TransactionDetailStatus,
    UserProfile
} from '../models';
import { BatchPaymentTypeValue, BatchStatusValue } from '../models/Batch';
import { BatchCancelMetadata } from '../models/batch/cancelMetadata';
import { BatchResults } from '../models/BatchResults';
import {
    BatchFilterTypes,
    FilterTypeResults,
    FilterValueResults
} from '../models/FilterValueResults';
import { InvestmentType } from '../models/Investment';
import { InvoiceResults } from '../models/InvoiceResults';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { BatchRepository } from '../repositories/Batch';
import { FundTransactionDetailRepository } from '../repositories/FundTransactionDetail';
import { HoldingRepository } from '../repositories/Holding';
import { PoolInvestmentHoldingRepository } from '../repositories/PoolInvestmentHolding';
import { mapNewTransactionsAndGenerateRecords } from '../utilities/createManualTransaction';
import { currency } from '../utilities/currency';
import { capitalizationFormatter } from '../utilities/format';
import { generateBatchFilters } from '../utilities/generateBatchFilters';
import { groupTransactionsByMetadataPaymentType } from '../utilities/groupTransactionsByRecipientPaymentType';
import { groupBySourceAndDestinationAccounts } from '../utilities/groupTransactionBatches';
import { groupTransactionsByRecipientPaymentType } from '../utilities/groupTransactionsByRecipientPaymentType';
import { UtilityResolver } from './core/UtilityResolver';
import { InstitutionAccountTransactionType } from '../models/InstitutionAccountTransaction';

@Resolver(type => Batch)
export class BatchResolver extends UtilityResolver {
    @Query(type => BatchResults)
    async batches(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: BatchOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => BatchFilter, { nullable: true })
        where?: BatchFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<BatchResults> {
        const repo = context.typeorm.manager.getRepository(Batch);
        const transactionsQuery = this.createQuery(repo, null, orderBy, skip, take, search);
        const countQuery = this.createQuery(repo, null, null, null, null, search, false);

        // manually add batch filter to both queries
        if (where)
            [transactionsQuery, countQuery].forEach(query => {
                for (const key in where) {
                    // iterate through each filter type if filter values are set
                    if ((where[key] || []).length) {
                        switch (key) {
                            case 'source':
                            case 'destination':
                                const columnName = `${key}_glaccount_id`;
                                query.andWhere(`"${columnName}" IN (:...ids)`, { ids: where[key] });
                                break;

                            case 'status':
                                query.andWhere('status IN (:...statuses)', {
                                    statuses: where[key]
                                });
                                break;

                            default:
                                throw new Error(
                                    `Invalid filter: "${key}". Expecting "source", "destination", or "status"`
                                );
                        }
                    }
                }
            });

        const [[{ current_timestamp: timestamp }], data, count] = await Promise.all([
            context.typeorm.query('SELECT CURRENT_TIMESTAMP'),
            transactionsQuery.getMany(),
            countQuery.getCount()
        ]);

        return {
            timestamp,
            data,
            count
        };
    }

    @Query(type => InvoiceResults)
    async getInvoice(
        @Ctx() context: GraphQLContext,
        @Arg('batchId', type => String, { nullable: false }) batchId: string
    ): Promise<InvoiceResults> {
        const batch = await context.typeorm.manager
            .getRepository(Batch)
            .createQueryBuilder('batch')
            .leftJoinAndSelect('batch.transactions', 'transactions')
            .leftJoinAndSelect('transactions.fundInvestment', 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.fund', 'fund')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .leftJoinAndSelect('batch.sourceGLAccount', 'sourceGLAccount')
            .leftJoinAndSelect(
                'sourceGLAccount.institutionAccount',
                'sourceInstitutionAccount',
                'sourceInstitutionAccount.isSweepAccount = false'
            )
            .leftJoinAndSelect('batch.destinationGLAccount', 'destinationGLAccount')
            .leftJoinAndSelect(
                'destinationGLAccount.institutionAccount',
                'destinationInstitutionAccount',
                'destinationInstitutionAccount.isSweepAccount = false'
            )
            .where('batch.id = :id', { id: batchId })
            .getOne();

        // we need the tenant details for the invoice
        const tenantId = batch.sourceGLAccount.tenantId;
        const tenant = await context.typeorm.manager
            .getRepository(Tenant)
            .createQueryBuilder('tenant')
            .where('tenant.id = :id', { id: tenantId })
            .getOne();

        const isIMA = batch.transactions.some(trans => {
            return trans.fundInvestment.investment.investmentType === InvestmentType.IMA;
        });
        const fundName = batch.transactions[0].fundInvestment.fund.name;

        const results = {
            batchCode: batch.batchCode,
            amount: batch.amount,
            sourceAccountName: isIMA ? fundName : batch.sourceGLAccount.title.replace(/_/g, ' '),
            sourceAccountNumber:
                batch.sourceGLAccount?.institutionAccount?.displayAccountNumber ?? '',
            destinationAccountName:
                batch.destinationGLAccount?.institutionAccount?.custodianName ?? '',
            destinationAccountNumber:
                batch.destinationGLAccount?.institutionAccount?.displayAccountNumber ?? '',
            destinationRoutingNumber:
                batch.destinationGLAccount?.institutionAccount?.routingNumber ?? '',

            destinationBankAddressLine1:
                batch.destinationGLAccount?.institutionAccount?.addressLine1 ?? '',
            destinationBankAddressLine2:
                batch.destinationGLAccount?.institutionAccount?.addressLine2 ?? '',
            destinationBankAddressCity:
                batch.destinationGLAccount?.institutionAccount?.addressCity ?? '',
            destinationBankAddressZip:
                batch.destinationGLAccount?.institutionAccount?.addressZip ?? '',
            destinationBankAddressState:
                batch.destinationGLAccount?.institutionAccount?.addressState ?? '',

            tenantName: tenant.name,
            tenantEmail: tenant.appSetting.email,
            tenantPhone: tenant.phone || '',
            tenantAddressLineOne: tenant.addressLineOne || '',
            tenantCityStateZip: tenant.cityStateZip || '',

            isIMA
        };

        return results;
    }

    @Query(type => Batch)
    async batchDetails(
        @Ctx() context: GraphQLContext,
        @Arg('batchId', type => String, { nullable: false }) batchId: string
    ): Promise<Batch> {
        const repo = context.typeorm.manager.getRepository(Batch);
        const batch = await repo
            .createQueryBuilder('batch')
            .leftJoinAndSelect('batch.transactions', 'transactions')
            .leftJoinAndSelect('transactions.fundTransaction', 'fundTransaction')
            .leftJoinAndSelect('fundTransaction.fund', 'fund')
            .leftJoinAndSelect('fund.createdByUserProfile', 'createdByUserProfile')
            .leftJoinAndSelect('transactions.transactionDetailType', 'transactionDetailType')
            .leftJoinAndSelect('transactions.transactionDetailStatus', 'transactionDetailStatus')
            .leftJoinAndSelect('batch.sourceGLAccount', 'sourceGLAccount')
            .leftJoinAndSelect('batch.destinationGLAccount', 'destinationGLAccount')
            .where('batch.id = :id', { id: batchId })
            .getOne();

        return batch;
    }

    private async allFundsHaveSufficientBalance(
        transactions: FundTransactionDetail[],
        poolHoldingRepo,
        imaHoldingRepo
    ): Promise<boolean> {
        const summingObject = {} as any;
        for (const detail of transactions) {
            if (detail.transactionDetailType.name !== TransactionDetailTypeName.DIVESTMENT) {
                continue;
            }
            if (typeof detail.fundInvestment === 'undefined') {
                continue;
            }
            const { fundId } = detail.fundTransaction;
            const fundInvestmentId = detail.fundInvestment.id;
            const detailValue = Math.abs(detail.amount);

            if (summingObject.hasOwnProperty(fundInvestmentId)) {
                if (detailValue > summingObject[fundInvestmentId]) {
                    return false;
                }
                summingObject[fundInvestmentId] -= detailValue;
            } else {
                let holdingAmount = 0;
                if (detail.fundInvestment.investment.investmentType === InvestmentType.POOL) {
                    holdingAmount = await poolHoldingRepo.getCurrentPoolHoldingValueForFund(
                        fundId,
                        fundInvestmentId
                    );
                } else if (detail.fundInvestment.investment.investmentType === InvestmentType.IMA) {
                    holdingAmount = await imaHoldingRepo.getCurrentIMAHoldingValueForFund(
                        fundId,
                        detail.fundInvestment.investmentId
                    );
                }

                if (detailValue > holdingAmount) {
                    return false;
                }

                summingObject[fundInvestmentId] = holdingAmount - Math.abs(detail.amount);
            }
        }

        return true;
    }

    private async findInvestmentIdsWithoutBalance(
        transactions: FundTransactionDetail[],
        poolHoldingRepo,
        imaHoldingRepo
    ): Promise<string[]> {
        const summingObject = {} as any;
        const fundInvestmentIdObject = {} as any;
        for (const detail of transactions) {
            if (detail.transactionDetailType.name !== TransactionDetailTypeName.DIVESTMENT) {
                continue;
            }
            if (detail.fundInvestment == null) {
                continue;
            }
            const { fundId } = detail.fundTransaction;
            const fundInvestmentId = detail.fundInvestment.id;
            const detailValue = Math.abs(detail.amount);

            if (summingObject.hasOwnProperty(fundInvestmentId)) {
                if (detailValue > summingObject[fundInvestmentId]) {
                    fundInvestmentIdObject[fundInvestmentId] = true;
                }
                summingObject[fundInvestmentId] -= detailValue;
            } else {
                let holdingAmount = 0;
                if (detail.fundInvestment.investment.investmentType === InvestmentType.POOL) {
                    holdingAmount = await poolHoldingRepo.getCurrentPoolHoldingValueForFund(
                        fundId,
                        fundInvestmentId
                    );
                } else if (detail.fundInvestment.investment.investmentType === InvestmentType.IMA) {
                    holdingAmount = await imaHoldingRepo.getCurrentIMAHoldingValueForFund(
                        fundId,
                        detail.fundInvestment.investmentId
                    );
                }
                if (detailValue > holdingAmount) {
                    fundInvestmentIdObject[fundInvestmentId] = true;
                }

                summingObject[fundInvestmentId] = holdingAmount - Math.abs(detail.amount);
            }
        }

        return Object.keys(fundInvestmentIdObject);
    }

    private generateInvestmentBatchesQuery(
        connection: Connection,
        {
            input,
            filters,
            search
        }: { input?: CreateBatchInput; filters?: TransactionDetailCustomFilter; search?: string }
    ): SelectQueryBuilder<FundTransactionDetail> {
        const where = Object.assign(
            {
                transactionDetailType: {
                    name: {
                        in: [
                            TransactionDetailTypeName.INVESTMENT,
                            TransactionDetailTypeName.DIVESTMENT,
                            TransactionDetailTypeName.TRANSFER
                        ]
                    }
                },
                transactionDetailStatus: { name: TransactionDetailStatusValue.PENDING },
                _customQuery: [
                    { entity: 'entity', join: 'fundTransaction' },
                    { entity: 'entity', join: 'fundInvestment' },
                    { entity: 'fundInvestment', join: 'investment' }
                ]
            },
            input.omittedTransactionDetailIds.length > 0
                ? { id: { notIn: input.omittedTransactionDetailIds } }
                : {}
        );

        const transactionsQuery = this.createQuery(
            connection.getRepository(FundTransactionDetail),
            where,
            null,
            null,
            null,
            search
        )
            .andWhere('entity.sourceAccountId IS NOT NULL')
            .andWhere('entity.destinationAccountId IS NOT NULL');

        return generateBatchFilters(transactionsQuery, filters);
    }

    private generateGrantPaymentBatchesQuery(
        manager: EntityManager,
        {
            includedTransactionIds,
            filters,
            search
        }: {
            includedTransactionIds?: string[];
            filters?: TransactionDetailCustomFilter;
            search?: string;
        }
    ): SelectQueryBuilder<FundTransactionDetail> {
        const transactionsQuery = this.createQuery(
            manager.getRepository(FundTransactionDetail),
            null,
            null,
            null,
            null,
            search
        )
            .leftJoinAndSelect('entity.fundTransaction', 'ft')
            .leftJoinAndSelect('entity.fundInvestment', 'fi')
            .leftJoinAndSelect('entity.transactionDetailStatus', 'tds')
            .leftJoinAndSelect('entity.transactionDetailType', 'tdt')
            .leftJoinAndSelect('ft.recipient', 'r')
            .andWhere('tdt.name = :name', { name: TransactionDetailTypeName.CASH_OUT });

        if (includedTransactionIds && includedTransactionIds.length) {
            transactionsQuery.andWhere('entity.fundTransactionId IN (:...ids)', {
                ids: includedTransactionIds
            });
        }

        return generateBatchFilters(transactionsQuery, filters);
    }

    private sortInvestmentBatchesData(data: any[], orderBy: any, skip: number, take: number) {
        const [field] = Object.keys(orderBy);
        const isAccount = ['sourceGLAccount', 'destinationGLAccount'].includes(field);
        const direction = isAccount ? orderBy[field].title : orderBy[field];

        let sortFn = (a: number | string, b: number | string): number => {
            if (direction === 'ASC') return a[field] - b[field];
            return b[field] - a[field];
        };

        // sort by count
        if (field === 'transactions') {
            sortFn = (a, b) => {
                if (direction === 'ASC') return a[field].length - b[field].length;
                return b[field].length - a[field].length;
            };
        }

        // alphabetic sort
        if (isAccount) {
            sortFn = (a, b) => {
                if (direction === 'ASC') {
                    if (a[field].title < b[field].title) return -1;
                    if (a[field].title > b[field].title) return 1;
                } else {
                    if (b[field].title < a[field].title) return -1;
                    if (b[field].title > a[field].title) return 1;
                }

                return 0;
            };
        }

        return data.sort(sortFn).slice(skip, skip + take);
    }

    @Query(type => BatchResults)
    async getInvestmentBatches(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateBatchInput,
        @Arg('orderBy', { nullable: true }) orderBy?: BatchOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('filters', type => TransactionDetailCustomFilter, { nullable: true })
        filters?: TransactionDetailCustomFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<BatchResults> {
        const batchRepo = context.typeorm.manager.getCustomRepository(BatchRepository);
        const poolHoldingsRepo = context.typeorm.manager.getCustomRepository(
            PoolInvestmentHoldingRepository
        );
        const imaHoldingsRepo = context.typeorm.manager.getCustomRepository(HoldingRepository);

        const transactionsQuery = this.generateInvestmentBatchesQuery(context.typeorm, {
            input,
            filters,
            search
        });

        const transactions = await transactionsQuery.getMany();

        const haveBalance = await this.allFundsHaveSufficientBalance(
            transactions,
            poolHoldingsRepo,
            imaHoldingsRepo
        );

        const transactionGroups = groupBySourceAndDestinationAccounts(transactions);
        const batches = await Promise.all(
            transactionGroups.map(group => {
                return batchRepo.generateBatchEntityForTransactions(
                    group.transactions,
                    group.sourceAccountId,
                    group.destinationAccountId
                );
            })
        );
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        return {
            timestamp,
            data: this.sortInvestmentBatchesData(batches, orderBy, skip, take),
            count: batches.length,
            allFundsHaveSufficientBalance: haveBalance
        };
    }

    @Mutation(type => BatchResults)
    async createInvestmentBatches(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateBatchInput,
        @Arg('filters', type => TransactionDetailCustomFilter, { nullable: true })
        filters?: TransactionDetailCustomFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<BatchResults> {
        const manager = context.typeorm.manager;
        const batchRepo = manager.getCustomRepository(BatchRepository);
        const poolHoldingRepo = manager.getCustomRepository(PoolInvestmentHoldingRepository);
        const imaHoldingRepo = manager.getCustomRepository(HoldingRepository);
        const detailRepo = manager.getCustomRepository(FundTransactionDetailRepository);

        const transactionsQuery = this.generateInvestmentBatchesQuery(context.typeorm, {
            input,
            filters,
            search
        });

        const transactions = await transactionsQuery.getMany();
        const fundInvestmentIds = await this.findInvestmentIdsWithoutBalance(
            transactions,
            poolHoldingRepo,
            imaHoldingRepo
        );

        const transactionsWithoutFunding = [] as FundTransactionDetail[];
        const transactionsToProcess = [] as FundTransactionDetail[];

        for (const ftd of transactions) {
            if (
                ftd.transactionDetailType.name === TransactionDetailTypeName.DIVESTMENT &&
                ftd.fundInvestment != null && fundInvestmentIds.includes(ftd.fundInvestment.id)
            ) {
                transactionsWithoutFunding.push(ftd);
            } else {
                transactionsToProcess.push(ftd);
            }
        }

        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        const transactionGroups = groupBySourceAndDestinationAccounts(transactionsToProcess);
        let batches = await Promise.all(
            transactionGroups.map(group => {
                if (group.transactions.length) {
                    return batchRepo.createBatchForTransactions(
                        group.transactions,
                        group.sourceAccountId,
                        group.destinationAccountId
                    );
                } else {
                    return null;
                }
            })
        );
        batches = batches.filter(batch => batch !== null)
        transactionsWithoutFunding.forEach(transaction => (transaction.onHold = true));

        detailRepo.save(transactionsWithoutFunding);

        eventEmitter.emit(
            EVENTS.SEND_MONEY_MOVEMENT_INSTRUCTIONS,
            batches.map(batch => batch.id)
        );

        return {
            timestamp,
            data: batches,
            count: batches.length,
            allFundsHaveSufficientBalance: transactionsWithoutFunding.length === 0
        };
    }

    public async generateGrantPaymentBatches(manager: EntityManager, ids: string[]) {
        console.log('generateGrantPaymentBatches: Start');
        const transactionDetailStatusRepo = manager.getRepository(TransactionDetailStatus);
        const batchRepo = manager.getCustomRepository(BatchRepository);
        const repo = manager.getRepository(FundTransactionDetail);

        const cashOutDetailStatus = await transactionDetailStatusRepo.findOne({
            name: TransactionDetailStatusValue.PENDING_RECONCILIATION
        });

        const transactions = await repo
            .createQueryBuilder('transactionDetail')
            .leftJoinAndSelect('transactionDetail.fundTransaction', 'fundTransaction')
            .leftJoinAndSelect('transactionDetail.fundInvestment', 'fundInvestment')
            .leftJoinAndSelect(
                'transactionDetail.transactionDetailStatus',
                'transactionDetailStatus'
            )
            .leftJoinAndSelect('transactionDetail.transactionDetailType', 'transactionDetailType')
            .leftJoinAndSelect('fundTransaction.transactionInfo', 'transactionInfo')
            .leftJoinAndSelect('transactionInfo.recipient', 'recipient')
            .andWhere('transactionDetailType.name = :name', {
                name: TransactionDetailTypeName.CASH_OUT
            })
            .andWhere('transactionDetail.fundTransactionId IN (:...ids)', {
                ids: ids
            })
            .getMany();
        console.log(
            `generateGrantPaymentBatches: Loaded transaction detail records. ${transactions
                .map(t => t.transactionCode)
                .join(',')}`
        );
        console.log(
            'generateGrantPaymentBatches: Sorting transaction details by grant payment type'
        );
        const sortedTransactions = groupTransactionsByMetadataPaymentType(transactions);

        // All grant payments will have the same source and destination
        const sourceAccountId = transactions[0].sourceAccountId;
        const destinationAccountId = transactions[0].destinationAccountId;

        const checkBatches = [];
        if (sortedTransactions['CHECK'].length > 0) {
            console.log('generateGrantPaymentBatches: Creating CHECK batches');
            for (const transaction of sortedTransactions['CHECK']) {
                console.log(
                    `generateGrantPaymentBatches: Creating CHECK batch for ${transaction.transactionCode}`
                );
                const batch = await batchRepo.createBatchForTransactions(
                    [transaction],
                    sourceAccountId,
                    destinationAccountId,
                    BatchPaymentTypeValue.CHECK
                );
                console.log(
                    `generateGrantPaymentBatches: Created CHECK batch ${batch.batchCode} for ${transaction.transactionCode}`
                );
                console.log(
                    `generateGrantPaymentBatches: Updating TransactionDetail record ${transaction.transactionCode}`
                );
                await repo
                    .createQueryBuilder('transactionDetail')
                    .update()
                    .set({
                        batchId: batch.id,
                        transactionDetailStatusId: cashOutDetailStatus.id
                    })
                    .where('id = :id', { id: transaction.id })
                    .execute();
                checkBatches.push(batch);
            }
        }
        const wireBatches = [];
        if (sortedTransactions['WIRE'].length > 0) {
            console.log('generateGrantPaymentBatches: Creating WIRE batches');
            for (const transaction of sortedTransactions['WIRE']) {
                console.log(
                    `generateGrantPaymentBatches: Creating WIRE batch for ${transaction.transactionCode}`
                );
                const batch = await batchRepo.createBatchForTransactions(
                    [transaction],
                    sourceAccountId,
                    destinationAccountId,
                    BatchPaymentTypeValue.WIRE
                );
                console.log(
                    `generateGrantPaymentBatches: Created WIRE batch ${batch.batchCode} for ${transaction.transactionCode}`
                );
                console.log(
                    `generateGrantPaymentBatches: Updating TransactionDetail record ${transaction.transactionCode}`
                );
                await repo
                    .createQueryBuilder('transactionDetail')
                    .update()
                    .set({
                        batchId: batch.id,
                        transactionDetailStatusId: cashOutDetailStatus.id
                    })
                    .where('id = :id', { id: transaction.id })
                    .execute();
                wireBatches.push(batch);
            }
        }
        let achBatch: Batch = null;
        if (sortedTransactions['ACH'].length > 0) {
            console.log('generateGrantPaymentBatches: Creating ACH batch');
            console.log(
                `generateGrantPaymentBatches: Creating ACH batch for ${sortedTransactions['ACH']
                    .map(t => t.transactionCode)
                    .join(',')}`
            );
            achBatch = await batchRepo.createBatchForTransactions(
                sortedTransactions['ACH'],
                sourceAccountId,
                destinationAccountId,
                BatchPaymentTypeValue.ACH
            );
            console.log(
                `generateGrantPaymentBatches: Created ACH batch ${achBatch.batchCode
                } for ${sortedTransactions['ACH'].map(t => t.transactionCode).join(',')}`
            );
            await repo
                .createQueryBuilder('transactionDetail')
                .update()
                .set({
                    batchId: achBatch.id,
                    transactionDetailStatusId: cashOutDetailStatus.id
                })
                .whereInIds(sortedTransactions['ACH'].map(t => t.id))
                .execute();
        }

        const allBatches = [...wireBatches, ...checkBatches];
        if (achBatch) {
            allBatches.push(achBatch);
        }

        return allBatches;
    }

    @Mutation(type => Batch)
    async createManualBatch(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: ManualBatchInput
    ): Promise<Batch> {
        const manager = context.typeorm.manager;
        const transactionDetailRepo = manager.getRepository(FundTransactionDetail);
        const transactionDetailStatusRepo = manager.getRepository(TransactionDetailStatus);
        // const holdingRepo = manager.getRepository(Holding);
        const batchRepo = manager.getCustomRepository(BatchRepository);
        const userProfile = await this.getCurrentUserProfile(context);
        let newTransactions: FundTransactionDetail[];

        if (input.manualTransactions) {
            newTransactions = await mapNewTransactionsAndGenerateRecords(
                manager,
                userProfile.id,
                input.manualTransactions,
                input.sourceAccount,
                input.destinationAccount
            );
        }
        let transactionsQuery: SelectQueryBuilder<FundTransactionDetail>;

        if (!!input.includedTransactionDetailIds && !!input.includedTransactionDetailIds.length) {
            transactionsQuery = transactionDetailRepo
                .createQueryBuilder('transactionDetail')
                .leftJoinAndSelect('transactionDetail.fundInvestment', 'fundInvestment')
                .andWhere('transactionDetail.id IN (:...transactionIds)', {
                    transactionIds: input.includedTransactionDetailIds
                });
        }

        const transactions = !!transactionsQuery ? await transactionsQuery.getMany() : undefined;

        const detailStatus = await transactionDetailStatusRepo.findOne({
            name: TransactionDetailStatusValue.PENDING_RECONCILIATION
        });

        const batch = await batchRepo.createManualBatch(
            transactions,
            newTransactions,
            input.sourceAccount,
            input.destinationAccount,
            input.paymentType,
            input.reconciliationLineItemDate
        );

        if (!!newTransactions && !!newTransactions.length) {
            const newTransactionIds = newTransactions.map(nt => {
                return nt.id;
            });
            await transactionDetailRepo
                .createQueryBuilder('transactionDetail')
                .update()
                .set({
                    batchId: batch.id,
                    transactionDetailStatusId: detailStatus.id
                })
                .where('id IN (:...transactionIds)', {
                    transactionIds: newTransactionIds
                })
                .execute();
        }

        if (!!input.includedTransactionDetailIds.length) {
            await transactionDetailRepo
                .createQueryBuilder('transactionDetail')
                .update()
                .set({
                    batchId: batch.id,
                    transactionDetailStatusId: detailStatus.id
                })
                .where('id IN (:...transactionIds)', {
                    transactionIds: input.includedTransactionDetailIds
                })
                .execute();
        }

        return batch;
    }

    @Mutation(type => Batch)
    async updateBatch(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateBatchInput
    ): Promise<Batch> {
        // TODO
        return;
    }

    @Mutation(type => Batch)
    async addNewTransactionsToBatch(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: AddNewTransactionsToBatchInput
    ): Promise<Batch> {
        const manager = context.typeorm.manager;
        const transactionDetailRepo = manager.getRepository(FundTransactionDetail);
        const transactionDetailStatusRepo = manager.getRepository(TransactionDetailStatus);
        const userProfile = await this.getCurrentUserProfile(context);
        let newTransactions: FundTransactionDetail[];
        let existingTransactions: FundTransactionDetail[];

        const batch = await manager.findOne(Batch, {
            id: input.batchId
        });

        if (input.manualTransactions) {
            newTransactions = await mapNewTransactionsAndGenerateRecords(
                manager,
                userProfile.id,
                input.manualTransactions,
                batch.sourceGLAccountId,
                batch.destinationGLAccountId
            );
        }

        const detailStatus = await transactionDetailStatusRepo.findOne({
            name: TransactionDetailStatusValue.PENDING
        });

        if (!!newTransactions && !!newTransactions.length) {
            const newTransactionIds = newTransactions.map(nt => {
                return nt.id;
            });
            await transactionDetailRepo
                .createQueryBuilder('transactionDetail')
                .update()
                .set({
                    batchId: input.batchId,
                    transactionDetailStatusId: detailStatus.id
                })
                .where('id IN (:...transactionIds)', {
                    transactionIds: newTransactionIds
                })
                .execute();
        }

        if (!!input.includedTransactionDetailIds && !!input.includedTransactionDetailIds?.length) {
            existingTransactions = await manager.find(FundTransactionDetail, {
                id: In(input.includedTransactionDetailIds)
            });
            await transactionDetailRepo
                .createQueryBuilder('transactionDetail')
                .update()
                .set({
                    batchId: input.batchId,
                    transactionDetailStatusId: detailStatus.id
                })
                .where('id IN (:...transactionIds)', {
                    transactionIds: input.includedTransactionDetailIds
                })
                .execute();
        }

        const { add } = currency;

        const existingTransactionsTotal =
            !!existingTransactions && !!existingTransactions.length
                ? existingTransactions.reduce((acc, g) => {
                    return (acc = add(acc, Math.abs(g.amount)));
                }, 0)
                : 0;

        const newTransactionsTotal =
            !!newTransactions && !!newTransactions.length
                ? newTransactions.reduce((acc, g) => {
                    return (acc = add(acc, Math.abs(g.amount)));
                }, 0)
                : 0;

        const combinedTotal = add(newTransactionsTotal, existingTransactionsTotal);

        batch.amount = add(batch.amount, combinedTotal);

        return await manager.save(batch);
    }

    @Mutation(type => Batch)
    async editBatchDetails(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: EditBatchInput
    ): Promise<Batch> {
        const manager = context.typeorm.manager;
        const batchRepo = manager.getRepository(Batch);

        const query = batchRepo.createQueryBuilder().update('batch');

        if (!!input.description?.length) {
            query.set({
                description: input.description,
                paymentType: input.paymentType as BatchPaymentTypeValue
            });
        } else {
            query.set({ paymentType: input.paymentType as BatchPaymentTypeValue });
        }

        query.where('batch.id = :id', {
            id: input.batchId
        });

        await query.execute();
        const batch = await manager.findOne(Batch, {
            id: input.batchId
        });
        return batch;
    }

    @Mutation(type => Batch)
    async removeTransactionFromBatch(
        @Ctx() context: GraphQLContext,
        @Arg('transactionIds', type => [String]) transactionIds: string[],
        @Arg('batchId') batchId: string
    ): Promise<Batch> {
        const manager = context.typeorm.manager;
        const batchRepo = manager.getRepository(Batch);
        const ftdRepo = manager.getRepository(FundTransactionDetail);
        const { add } = currency;

        const fundTransactionsOnBatch = await manager.find(FundTransactionDetail, {
            batchId,
            id: Not(In(transactionIds))
        });

        const amount = fundTransactionsOnBatch.reduce((acc, g) => {
            return (acc = add(acc, Math.abs(g.amount)));
        }, 0);

        const batch = await manager.findOne(Batch, {
            id: batchId
        });

        const detailStatus = await manager.findOne(TransactionDetailStatus, {
            name: TransactionDetailStatusValue.PENDING
        });

        await batchRepo
            .createQueryBuilder('batch')
            .update()
            .set({
                amount: currency.toCurrency(amount)
            })
            .where('id = :id', {
                id: batchId
            })
            .execute();

        await ftdRepo
            .createQueryBuilder('fundTransactionDetail')
            .update()
            .set({
                transactionDetailStatusId: detailStatus.id,
                batchId: null
            })
            .where('id IN (:...transactionIds)', {
                transactionIds
            })
            .execute();

        return batch;
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECONCILIATION, PermissionAccessLevel.READ)
    @Query(type => BatchResults)
    async getPossibleBatchesForTransaction(
        @Ctx() context: GraphQLContext,
        @Arg('institutionAccountTransactionId', type => String)
        institutionAccountTransactionId: string
    ): Promise<BatchResults> {
        const institutionAccountTransaction = await context.typeorm.manager
            .getRepository(InstitutionAccountTransaction)
            .createQueryBuilder('entity')
            .innerJoinAndSelect('entity.institutionAccount', 'institutionAccount')
            .where('entity.id = :id', { id: institutionAccountTransactionId })
            .getOne();

        if (!institutionAccountTransaction) {
            throw new Error('Unable to find Institution Account Transaction with specified id');
        }
        if (institutionAccountTransaction.glAccountReconciliationId) {
            throw new Error('Transaction is already reconciled');
        }
        const institutionAccountId = institutionAccountTransaction.institutionAccountId;
        const glAccountId = institutionAccountTransaction.institutionAccount?.glAccountId;
        if (!glAccountId) {
            throw new Error('Unable to find Gl Account for Institution Account Transaction');
        }

        const batchRepo = context.typeorm.manager.getRepository(Batch);

        /** 
         * @note we no longer expect a date constraint between batches and transactions 
         const endOfDateTransactionPosted = dayjs(institutionAccountTransaction.date)
         .endOf('day')
         .format('YYYY-MM-DD HH:mm');
         * @note date-transaction constraint for reference:
         * batch.createdOn <= endOfDateTransactionPosted
         * */

        let data = await batchRepo
            .createQueryBuilder('entity')
            .leftJoinAndSelect('entity.transactions', 'transactions')
            .leftJoinAndSelect('transactions.fundTransaction', 'fundTransaction')
            .leftJoinAndSelect('transactions.transactionDetailType', 'transactionDetailType')
            .where(
                '(entity.sourceGLAccountId = :sourceGLAccountId OR entity.destinationGLAccountId = :destinationGLAccountId)',
                { sourceGLAccountId: glAccountId, destinationGLAccountId: glAccountId }
            )
            .andWhere('entity.status != :status', { status: BatchStatusValue.CANCELED })
            .orderBy('entity.createdOn', 'DESC')
            .getMany();

        if (data.length > 0) {
            // Filter already matched batches
            const transactionsWithBatchMatched = await context.typeorm.manager
                .getRepository(InstitutionAccountTransaction)
                .createQueryBuilder('entity')
                .where('entity.institutionAccountId = :institutionAccountId', {
                    institutionAccountId: institutionAccountId
                })
                .andWhere('entity.batchId IN (:...batchIds)', { batchIds: data.map(d => d.id) })
                .getMany();

            const matchedBatchIds = transactionsWithBatchMatched.map(t => t.batchId);
            // here we filter batches that are not already reconciled/matched
            data = data.filter(d => !matchedBatchIds.includes(d.id));

            if (
                institutionAccountTransaction.amount === 0 &&
                institutionAccountTransaction.transactionType ===
                InstitutionAccountTransactionType.TRANSFER
            ) {
                // If the transactions is a stock transfer, look for a batch with a stock contribution
                // that has the right number of units
                data = data.filter(d => {
                    const stockInTransaction = d.transactions.find(
                        t => t.transactionDetailType.name === TransactionDetailTypeName.STOCK_IN
                    );
                    const transactionUnits =
                        stockInTransaction?.fundTransaction.metadata?.paymentDetails?.units;
                    if (!transactionUnits) {
                        return false;
                    }
                    return (
                        stockInTransaction &&
                        parseFloat(transactionUnits) === institutionAccountTransaction.units
                    );
                });
            } else {
                const roundedTransactionAmount =
                    Math.round(institutionAccountTransaction.amount * 100) / 100;
                data = data.filter(d => {
                    const roundedAmount = Math.round(d.amount * 100) / 100;
                    return Math.abs(roundedAmount) === Math.abs(roundedTransactionAmount);
                });
            }
        }

        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        return {
            timestamp,
            data: data,
            count: data.length
        };
    }

    @Query(type => [Security])
    async getSecuritiesForFund(
        @Ctx() context: GraphQLContext,
        @Arg('destinationAccountId', type => String) destinationAccountId: string,
        @Arg('bypassIdCheck', type => Boolean) bypassIdCheck: boolean,
        @Arg('search', type => String, { nullable: true }) search?: string,
        @Arg('take', type => Int, { nullable: true }) take?: number
    ): Promise<Security[]> {
        const manager = context.typeorm.manager;
        const securityRepo = manager.getRepository(Security);

        const securitiesQuery = this.createQuery(securityRepo, null, null, null, take, search)
            .leftJoinAndSelect('entity.holdings', 'holdings')
            .leftJoinAndSelect('holdings.institutionAccount', 'institutionAccount');

        // if (!!destinationAccountId?.length && !bypassIdCheck) {
        //     securitiesQuery.andWhere('institutionAccount.glAccountId = :destinationAccountId', {
        //         destinationAccountId: destinationAccountId
        //     });
        // } else if (!destinationAccountId?.length && !bypassIdCheck) {
        //     securitiesQuery.andWhere('institutionAccount.glAccountId IS NULL');
        // }

        return await securitiesQuery.getMany();
    }

    @Query(type => Security)
    async getSecurityById(
        @Ctx() context: GraphQLContext,
        @Arg('securityId', type => String) securityId: string
    ): Promise<Security> {
        const manager = context.typeorm.manager;
        return await manager.findOne(Security, {
            id: securityId
        });
    }

    @Query(type => Security, { nullable: true })
    async getSecurityByTickerSymbol(
        @Ctx() context: GraphQLContext,
        @Arg('tickerSymbol', type => String) tickerSymbol: string
    ): Promise<Security> {
        const manager = context.typeorm.manager;
        return await manager.findOne(Security, {
            tickerSymbol
        });
    }

    @Query(type => GLAccount)
    async getGlAccountByInstitutionAccountId(
        @Ctx() context: GraphQLContext,
        @Arg('institutionAccountId', type => String) institutionAccountId: string
    ): Promise<GLAccount> {
        const manager = context.typeorm.manager;
        const ia = await manager.findOne(InstitutionAccount, {
            id: institutionAccountId
        });
        return await manager.findOne(GLAccount, {
            id: ia.glAccountId
        });
    }

    @Mutation(type => Batch)
    async cancelBatch(
        @Ctx() context: GraphQLContext,
        @Arg('id', type => String) id: string
    ): Promise<Batch> {
        const repo = context.typeorm.getRepository(Batch);
        const batch = await repo.findOne({
            where: { id },
            relations: [
                'transactions',
                'transactions.fundTransaction',
                'transactions.fundTransaction.fund',
                'transactions.fundTransaction.transactionType'
            ]
        });

        // cache createdByProfiles
        const createdByProfile: UserProfile[] = [];
        const fetchCreatedByProfile = async (id: string): Promise<UserProfile> => {
            // fetch from cache
            const cachedProfile = createdByProfile.find(f => f.id === id);
            if (cachedProfile) return Promise.resolve(cachedProfile);

            // fetch from db
            const userProfile = await context.typeorm.getRepository(UserProfile).findOne({ id });
            if (userProfile) createdByProfile.push(userProfile);
            return userProfile;
        };

        // generate metadata blob
        const cancelMetadata: BatchCancelMetadata[] = [];
        for await (const transaction of batch.transactions) {
            const { fundTransaction: ft } = transaction;
            const createdByProfile = await fetchCreatedByProfile(ft.createdBy);

            cancelMetadata.push({
                id: transaction.id,
                // this is being coerced into a string regardless
                createdOn: transaction.createdOn.toString(),
                amount: transaction.amount,
                fundTransaction: {
                    createdByProfile: { fullName: createdByProfile.fullName },
                    fund: {
                        id: ft.fund.id,
                        fundCode: ft.fund.fundCode,
                        name: ft.fund.name
                    },
                    id: ft.id,
                    transactionCode: ft.transactionCode,
                    transactionType: { name: ft.transactionType.name },
                    // optional metadata
                    ...(ft.metadata?.paymentDetails?.paymentType
                        ? {
                            metadata: {
                                paymentDetails: {
                                    paymentType: ft.metadata.paymentDetails?.paymentType
                                }
                            }
                        }
                        : null)
                }
            });
        }

        // update batch
        batch.status = BatchStatusValue.CANCELED;
        batch.cancelMetadata = cancelMetadata;
        batch.canceledOn = new Date();
        batch.transactions = []; // reset detail records

        /** @note run the following queries synchronously to prevent hooks from overwriting data */

        /**
         * @note for some reason some fundTransactionDetail records are either:
         * not being disassociated OR being re-associated to a batch
         * this is the first step in identifying why this happens
         * */
        let updatedBatch: Batch;
        try {
            updatedBatch = await repo.save(batch);
        } catch (error) {
            console.error('Unable to save batch: ', batch, '\n', error);
        }

        // disassociate batch-fundTransactionDetails
        await context.typeorm
            .createQueryBuilder()
            .update(FundTransactionDetail)
            .set({ batchId: null, batch: null })
            .where('batchId = :batchId', { batchId: batch.id })
            .execute()
            .catch(err => {
                console.error(
                    `unable to disassociate fund transactions to batch ${batch.id}\n`,
                    err
                );
            });

        // delete mock transactions
        await context.typeorm
            .createQueryBuilder()
            .delete()
            .from(InstitutionAccountTransaction)
            .where('batchId = :batchId', { batchId: batch.id })
            .andWhere(`transaction_id LIKE 'MOCK-%-${batch.batchCode}'`)
            .execute();

        return updatedBatch;
    }

    @Query(type => Boolean)
    sendMoneyMovementInstructions(
        @Ctx() context: GraphQLContext,
        @Arg('id', type => String) id: string
    ): boolean {
        eventEmitter.emit(EVENTS.SEND_MONEY_MOVEMENT_INSTRUCTIONS, [id]);
        return true;
    }

    @Query(type => FilterTypeResults)
    batchFilterTypes(@Ctx() context: GraphQLContext): FilterTypeResults {
        return { types: Object.values(BatchFilterTypes) };
    }

    // get all filter values
    @Query(type => FilterValueResults)
    async batchFilterValues(
        @Ctx() context: GraphQLContext,
        @Arg('filter', type => BatchFilterTypes) filter: BatchFilterTypes
    ): Promise<FilterValueResults> {
        const data = [];

        switch (filter) {
            case BatchFilterTypes.SOURCE:
            case BatchFilterTypes.DESTINATION:
                // fetch FK from batches
                const columnName = `${filter}_glaccount_id`;

                const batches: Batch[] = await context.typeorm
                    .getRepository(Batch)
                    .createQueryBuilder('batch')
                    .select(columnName)
                    .where(`"${columnName}" IS NOT NULL`)
                    .distinct(true)
                    .execute();

                // fetch GL accounts
                const glAccounts = await context.typeorm
                    .getRepository(GLAccount)
                    .find({ id: In(batches.map(batch => batch[columnName])) })
                    .then(async partialGlAccounts => {
                        // fetch all account data
                        const providerAccountData = await Promise.all(
                            partialGlAccounts.map(glAccount => {
                                return ProviderAccountData.getProviderAccountDataForGLAccount(
                                    context,
                                    glAccount
                                );
                            })
                        );
                        // add to glAccount model and filter accounts with no display name
                        return partialGlAccounts
                            .map((glAccount, i) => ({
                                ...glAccount,
                                providerAccountData: providerAccountData[i]
                            }))
                            .filter(glAccount => {
                                return glAccount.providerAccountData.displayName !== 'Not found';
                            });
                    });

                data.push(
                    ...glAccounts.map(glAccount => ({
                        text: glAccount.providerAccountData.displayName,
                        value: glAccount.id
                    }))
                );
                break;

            case BatchFilterTypes.STATUS:
                data.push(
                    ...Object.values(BatchStatusValue).map(status => ({
                        text: capitalizationFormatter(status),
                        value: status
                    }))
                );
                break;

            default:
                throw new Error(
                    `Invalid filter: "${filter}". Expecting ${Object.values(BatchFilterTypes).join(
                        ','
                    )}`
                );
        }

        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        return { timestamp, data };
    }
}
