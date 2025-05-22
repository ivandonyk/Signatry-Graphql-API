import { Resolver, Mutation, Query, Ctx, Arg, Int } from 'type-graphql';
import { In, Connection, Brackets, UpdateQueryBuilder, SelectQueryBuilder } from 'typeorm';
import { GraphQLUpload } from 'graphql-upload';
import parse from 'csv-parse';
import { camelCase, startCase, isNaN, toNumber, flatten } from 'lodash';
import { finished } from 'stream';

// models
import {
    FundTransaction,
    TransactionStatus,
    TransactionType,
    Fund,
    FundTransactionDetail,
    TransactionDetailStatus,
    TransactionDetailType,
    GLAccountType,
    TransactionEvent
} from '../models';
import {
    ParseCsvResponse,
    FeesCountResponse,
    FeeResponse,
    FeeIdsResponse,
    ProcessFeeResponse,
    FundsCheckResponse
} from '../models/FeesResponse';
import { TransactionTypeValue } from '../models/TransactionType';
import { FundTransactionResults } from '../models/FundTransactionResults';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { GLAccountTypeName } from '../models/GLAccountType';
import { EventNameValue } from '../models/TransactionEvent';
// inputs
import { FeeFilter } from '../inputs/Fees/FeeFilter';
import { FeeOrderBy } from '../inputs/Fees/FeeOrderBy';

import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { Upload } from '../types/uploadType';
import { PermissionLock } from '../decorators/permissionDecorator';
import { currency, numberFromCurrencyString, stringIsCurrency } from '../utilities/currency';
import {
    extractCsvData,
    createErrorBody,
    getTransactionType,
    fundsWithoutBalanceFromFundTransactions
} from '../utilities/fees';
import { getTransactionCode } from '../utilities/getTransactionCode';
import { isTCode } from '../utilities/transactionCode';
import { createDivestmentDetails } from '../utilities/transactionDetail';
import { GLAccountRepository } from '../repositories/GLAccount';
import { BatchRepository } from '../repositories/Batch';
import { isContext } from 'vm';
import { PoolInvestmentHoldingRepository } from '../repositories/PoolInvestmentHolding';
import { FundRepository } from '../repositories/Fund';

@Resolver()
export class FeeResolver extends UtilityResolver {
    private getFeeTransactionTypes() {
        return [TransactionTypeValue.ADMINISTRATION_FEE, TransactionTypeValue.INVESTMENT_FEE];
    }

    // returns investment/administration fee transaction types
    private getDefaultWhere() {
        return {
            transactionType: {
                name: {
                    in: this.getFeeTransactionTypes()
                }
            }
        };
    }

    /**
     * required aliases:
     *
     * `transactionDetailStatus` === `detailStatus`
     *
     * `transactionDetailType` === `detailType`
     */
    private getDetailCashOutBrackets() {
        return new Brackets(qb => {
            // pending cash_out
            qb.where('detailType.name = :cashOut', {
                cashOut: TransactionDetailTypeName.CASH_OUT
            }).andWhere('detailStatus.name = :pending', {
                pending: TransactionDetailStatusValue.PENDING
            });
        });
    }

    private getDivestmentSubQuery(qb: SelectQueryBuilder<FundTransaction>, alias: string) {
        const subQuery = qb
            .subQuery()
            .select('fundTransactionDetail.fundTransactionId')
            .from(FundTransactionDetail, 'fundTransactionDetail')
            .leftJoin('fundTransactionDetail.transactionDetailType', 'detailType')
            .leftJoin('fundTransactionDetail.transactionDetailStatus', 'detailStatus')
            .where('detailType.name = :divestment', {
                divestment: TransactionDetailTypeName.DIVESTMENT
            })
            .andWhere('detailStatus.name != :complete', {
                complete: TransactionDetailStatusValue.COMPLETE
            })
            .getQuery();

        return alias + '.id NOT IN ' + subQuery;
    }

    @Query(type => FeesCountResponse)
    @PermissionLock(PermissionAccessType.ADMIN_FUND_TRANSFERS, PermissionAccessLevel.READ)
    public async adminFeesCount(
        @Ctx() context: GraphQLContext,
        @Arg('where', type => FeeFilter, { nullable: true }) where?: FeeFilter,
        @Arg('isPaymentsTab', type => Boolean, { nullable: true }) isPaymentsTab?: boolean
    ): Promise<FeesCountResponse> {
        const repo = context.typeorm.getRepository(FundTransaction);
        const conditions = { ...where, ...this.getDefaultWhere() };

        const query = this.createQuery(repo, conditions);

        if (isPaymentsTab) {
            query
                .leftJoin('entity.transactionDetails', 'details')
                .leftJoin('details.transactionDetailStatus', 'detailStatus')
                .leftJoin('details.transactionDetailType', 'detailType')
                .andWhere(this.getDetailCashOutBrackets());
        }

        const [transactions, count] = await query.getManyAndCount();

        return Promise.resolve({
            count,
            sum: transactions.reduce((acc, transaction) => currency.add(acc, transaction.amount), 0)
        });
    }

    @Query(type => FundTransactionResults)
    @PermissionLock(PermissionAccessType.ADMIN_FUND_TRANSFERS, PermissionAccessLevel.READ)
    public async fees(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FeeOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FeeFilter, { nullable: true }) where?: FeeFilter,
        @Arg('search', type => String, { nullable: true }) search?: string,
        @Arg('isPaymentsTab', type => Boolean, { nullable: true }) isPaymentsTab?: boolean
    ): Promise<FundTransactionResults> {
        const repo = context.typeorm.getRepository(FundTransaction);

        const conditions = {
            ...where,
            ...this.getDefaultWhere()
        };

        const searchIsAmount = stringIsCurrency(search || '');
        const isCode = isTCode(search || '');

        const searchTerm = searchIsAmount || isCode ? null : search;

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, searchTerm);

        const countQuery = this.createQuery(repo, conditions, null, null, null, searchTerm, false);
        const selectableCountQuery = this.createQuery(
            repo,
            conditions,
            null,
            null,
            null,
            searchTerm
        );
        const totalCountQuery = this.createQuery(repo, conditions);

        selectableCountQuery.andWhere('entity.onHold = FALSE');

        if (searchTerm === null) {
            [dataQuery, countQuery].forEach(query => {
                if (searchIsAmount) {
                    query.andWhere('ABS(entity.amount) = CAST(:searchAmount AS DOUBLE PRECISION)', {
                        searchAmount: numberFromCurrencyString(search)
                    });
                } else if (isCode) {
                    query.andWhere('LOWER(entity.transactionCode) LIKE LOWER(:tCode)', {
                        tCode: `%${search}%`
                    });
                }
            });
        }

        if (isPaymentsTab) {
            [selectableCountQuery, countQuery, dataQuery].forEach(query => {
                query
                    .leftJoin('entity.transactionDetails', 'details')
                    .leftJoin('details.transactionDetailStatus', 'detailStatus')
                    .leftJoin('details.transactionDetailType', 'detailType');
            });

            countQuery.andWhere(this.getDetailCashOutBrackets());
            dataQuery.andWhere(this.getDetailCashOutBrackets());
            selectableCountQuery.andWhere(this.getDetailCashOutBrackets());
            selectableCountQuery.andWhere(qb => this.getDivestmentSubQuery(qb, 'entity'));
        }

        const [
            [{ current_timestamp: timestamp }],
            countResult,
            totalCountResult,
            data,
            selectableResults
        ] = await Promise.all([
            context.typeorm.query('SELECT CURRENT_TIMESTAMP'),
            countQuery.getMany(),
            totalCountQuery.getCount(),
            dataQuery.getMany(),
            selectableCountQuery.getMany()
        ]);

        return {
            timestamp,
            data,
            count: countResult.length,
            totalCount: totalCountResult,
            totalAmount: countResult.reduce((sum, t) => currency.add(sum, t.amount), 0),
            selectableCount: selectableResults.length,
            selectableAmount: selectableResults.reduce((sum, t) => currency.add(sum, t.amount), 0)
        };
    }

    // @todo double check if I need to get counts as well
    @Query(type => FeeIdsResponse)
    @PermissionLock(PermissionAccessType.ADMIN_FUND_TRANSFERS, PermissionAccessLevel.READ)
    public async feeIds(
        @Ctx() context: GraphQLContext,
        @Arg('where', type => FeeFilter, { nullable: true }) where?: FeeFilter,
        @Arg('isPaymentsTab', type => Boolean, { nullable: true }) isPaymentsTab?: boolean
    ): Promise<FeeIdsResponse> {
        const repo = context.typeorm.getRepository(FundTransaction);
        const conditions = {
            ...where,
            ...this.getDefaultWhere()
        };

        const query = this.createQuery(repo, conditions).distinct(true);

        if (isPaymentsTab) {
            query
                .leftJoin('entity.transactionDetails', 'details')
                .leftJoin('details.transactionDetailStatus', 'detailStatus')
                .leftJoin('details.transactionDetailType', 'detailType')
                .andWhere(this.getDetailCashOutBrackets())
                .andWhere(qb => this.getDivestmentSubQuery(qb, 'entity'));
        }

        query.andWhere('entity.onHold = FALSE');

        const [[{ current_timestamp: timestamp }], data] = await Promise.all([
            context.typeorm.query('SELECT CURRENT_TIMESTAMP'),
            query.getMany()
        ]);

        return Promise.resolve({
            timestamp,
            // split data into ids array and amount sum
            ...data.reduce(
                (acc, ft) => {
                    acc.ids.push(ft.id);
                    acc.totalAmount = currency.add(acc.totalAmount, ft.amount);
                    return acc;
                },
                { ids: [], totalAmount: 0 }
            )
        });
    }

    @Query(type => FundsCheckResponse)
    @PermissionLock(PermissionAccessType.ADMIN_FUND_TRANSFERS, PermissionAccessLevel.READ)
    public async feesUnableToBePaid(
        @Ctx() context: GraphQLContext,
        @Arg('omittedIds', type => [String], { nullable: false }) omittedIds: string[]
    ): Promise<FundsCheckResponse> {
        const query = this.processFeesQuery(context);
        if (omittedIds.length > 0) {
            query.andWhere('fundTransaction.id NOT IN (:...ids)', {
                ids: omittedIds
            });
        }

        const transactions = await query.getMany();

        const fundRepo = context.typeorm.getCustomRepository(FundRepository);

        const fundsWithout = await fundsWithoutBalanceFromFundTransactions(transactions, fundRepo);

        if (fundsWithout.length > 0) {
            query.andWhere('fund.id IN (:...fundsWithout)', { fundsWithout });
            query.select('fundTransaction.id');
            query.addSelect('fundTransaction.amount');

            const transactionsWithout = await query.getMany();
            const sum = transactionsWithout.reduce(
                (accum, t) => currency.add(accum, Math.abs(t.amount)),
                0
            );

            return {
                sum,
                count: transactionsWithout.length
            };
        }

        return {
            sum: 0,
            count: 0
        };
    }

    @Query(type => FeeResponse)
    @PermissionLock(PermissionAccessType.ADMIN_FUND_TRANSFERS, PermissionAccessLevel.READ)
    public async fee(
        @Ctx() context: GraphQLContext,
        @Arg('id', { nullable: true }) id?: string
    ): Promise<FeeResponse> {
        const [[{ current_timestamp: timestamp }], feeTransaction] = await Promise.all([
            context.typeorm.query('SELECT CURRENT_TIMESTAMP'),
            context.typeorm.getRepository(FundTransaction).findOne(id)
        ]);

        return {
            timestamp,
            data: feeTransaction
        };
    }

    @Mutation(type => ParseCsvResponse)
    async parseFeeCsv(
        @Ctx() context: GraphQLContext,
        @Arg('file', () => GraphQLUpload) file: Upload
    ): Promise<ParseCsvResponse> {
        // get default FundTransaction values
        const [userProfile, transactionStatus, transactionTypes] = await Promise.all([
            this.getCurrentUserProfile(context),
            context.typeorm.manager.findOne(TransactionStatus, {
                name: TransactionStatusValue.SUBMITTED
            }),
            context.typeorm.manager.find(TransactionType, {
                where: {
                    name: In(this.getFeeTransactionTypes())
                }
            })
        ]);

        // validation and errors
        const requiredFields = ['feeAmount', 'fundId', 'feeType'];
        const validFeeTypes = ['Administration', 'Investment'];
        const error: { field: string; message: string } = {
            field: undefined,
            message: undefined
        };
        // csv headers correspond to keys in `dataJson`
        const headers = [];
        // track what csv row we're consuming
        let rowIndex = 0;
        const fundTransactions = [];

        // cache funds
        const funds: Fund[] = [];
        const fetchFund = async (fundCode: string): Promise<Fund> => {
            // fetch from cache
            const cachedFund = funds.find(f => f.fundCode === fundCode);
            if (cachedFund) return Promise.resolve(cachedFund);

            // fetch from db
            const fund = await context.typeorm.manager.findOne(Fund, { fundCode });
            if (fund) funds.push(fund);
            return fund;
        };

        // parse the csv
        const stream = file.createReadStream().pipe(parse());

        return new Promise((resolve, reject) => {
            stream.on('data', async (chunk: string[]) => {
                // validate and store headers to be used as json keys
                if (rowIndex === 0) {
                    headers.push(...chunk.map((h: string) => camelCase(h)));
                    requiredFields.forEach((field: string) => {
                        if (!headers.includes(field)) {
                            error.field = field;
                            error.message = `CSV is missing column ${startCase(field)}`;
                        }
                    });

                    // return early on error
                    if (error.field) stream.destroy();
                } else {
                    // validate csv cells
                    let i = 0;
                    stream.pause();

                    for await (const val of chunk) {
                        const field = headers[i];
                        // required
                        if (!val.length && requiredFields.includes(field)) {
                            error.field = field;
                            error.message = `CSV is missing a ${startCase(field)} value`;
                        }
                        // validate fee type
                        if (field === 'feeType' && !validFeeTypes.includes(val)) {
                            error.field = field;
                            error.message = `CSV contains invalid ${startCase(
                                field
                            )}(s). Valid types are ${validFeeTypes
                                .join(', ')
                                .replace(/, ([^,]*)$/, ' and $1')}`;
                        }
                        // type number
                        if (field === 'feeAmount') {
                            if (isNaN(toNumber(val))) {
                                error.field = field;
                                error.message = `CSV contains invalid ${startCase(field)} ${val}`;
                            }
                        }
                        // validate fundCode
                        if (field === 'fundId') {
                            const fund = await fetchFund(val);
                            if (!fund) {
                                error.field = field;
                                error.message = `No fund exists with ${startCase(field)} ${val}`;
                            }
                        }
                        i++;
                    }

                    // return early on error
                    if (error.field) stream.destroy();

                    const csvTransactionDetails = extractCsvData(chunk, headers);
                    const transactionType = getTransactionType(
                        csvTransactionDetails.feeType,
                        transactionTypes
                    );

                    try {
                        const [transactionCode, fund] = await Promise.all([
                            getTransactionCode(transactionType, context.typeorm.manager),
                            fetchFund(csvTransactionDetails.fundCode)
                        ]);
                        fundTransactions.push(
                            context.typeorm.getRepository(FundTransaction).create({
                                ...csvTransactionDetails,
                                fundId: fund.id,
                                transactionCode,
                                transactionTypeId: transactionType.id,
                                transactionStatusId: transactionStatus.id,
                                userProfileId: userProfile.id,
                                createdBy: userProfile.id,
                                updatedBy: userProfile.id
                            })
                        );
                    } catch (error) {
                        console.error('Error create fundTransaction record', error);
                        return stream.destroy(error);
                    }

                    stream.resume();
                }
                rowIndex++;
            });

            // emitted on stream.destroy
            stream.on('close', () => {
                if (error.field) return resolve(createErrorBody(error));
            });

            finished(stream, async err => {
                if (err) {
                    console.error('error in stream', err);
                    return reject(err);
                }

                // empty csv: return missing column header error
                if (!rowIndex) {
                    return resolve(
                        createErrorBody({
                            field: requiredFields[0],
                            message: `CSV is missing column ${startCase(requiredFields[0])}`
                        })
                    );
                }

                try {
                    const bulkInserts = [];

                    let i = 1;
                    for await (const ft of fundTransactions) {
                        bulkInserts.push(ft);

                        // every 1000 or last item
                        if (i % 1000 === 0 || i === fundTransactions.length) {
                            const { identifiers: models } = await context.typeorm
                                .getRepository(FundTransaction)
                                .insert(bulkInserts);

                            const bulkEvents = models.map(model => {
                                return context.typeorm.manager.create(TransactionEvent, {
                                    fundTransactionId: model.id,
                                    name: EventNameValue.CREATED,
                                    createdBy: userProfile.id,
                                    updatedBy: userProfile.id,
                                    userProfileId: userProfile.id
                                });
                            });
                            // empty arrays
                            bulkInserts.splice(0, bulkInserts.length);
                            // create events (no need to wait)
                            context.typeorm.getRepository(TransactionEvent).insert(bulkEvents);
                        }
                        i++;
                    }

                    return resolve({ status: 'success' });
                } catch (error) {
                    return reject(error);
                }
            });
        });
    }

    /**
     * returns a `hasError` boolean
     */
    private async processFundTransactionFees(
        connection: Connection,
        fundTransactions: FundTransaction[],
        userProfileId: string
    ): Promise<boolean> {
        // fetch statuses, types, and glAccount
        const pendingStatusPromise = connection.manager.findOne(TransactionStatus, {
            name: TransactionStatusValue.PENDING
        });
        const feeExpenseAccountPromise = connection.manager.findOne(GLAccountType, {
            where: { name: GLAccountTypeName.ADMIN_FEE },
            relations: ['glAccounts']
        });
        const grantDisbursementAccountPromise = connection.manager.findOne(GLAccountType, {
            where: { name: GLAccountTypeName.GRANT_DISBURSEMENT },
            relations: ['glAccounts']
        });
        const detailPendingStatusPromise = connection.manager.findOne(TransactionDetailStatus, {
            name: TransactionDetailStatusValue.PENDING
        });
        const cashOutTypePromise = connection.manager.findOne(TransactionDetailType, {
            name: TransactionDetailTypeName.CASH_OUT
        });

        const [
            pendingStatus,
            detailPendingStatus,
            cashOutType,
            {
                glAccounts: [feeExpenseAccount]
            },
            {
                glAccounts: [grantDisbursementAccount]
            }
        ] = await Promise.all([
            pendingStatusPromise,
            detailPendingStatusPromise,
            cashOutTypePromise,
            feeExpenseAccountPromise,
            grantDisbursementAccountPromise
        ]);

        const divestmentCreationPromises: Promise<FundTransactionDetail[]>[] = [];
        const cashOutDetails: FundTransactionDetail[] = [];
        const updateStatusQueries: UpdateQueryBuilder<FundTransaction>[] = [];
        const events: TransactionEvent[] = [];

        const fundRepo = connection.getCustomRepository(FundRepository);
        const fundsWithout = await fundsWithoutBalanceFromFundTransactions(
            fundTransactions,
            fundRepo
        );

        const transactionsWithFunding = [] as FundTransaction[];
        const transactionsWithoutFunding = [] as FundTransaction[];

        for (const transaction of fundTransactions) {
            if (fundsWithout.includes(transaction.fundId)) {
                transactionsWithoutFunding.push(transaction);
            } else {
                transactionsWithFunding.push(transaction);
            }
        }

        // iterate over the fundTransactions once
        transactionsWithFunding.forEach(async fundTransaction => {
            // update status
            updateStatusQueries.push(
                connection
                    .createQueryBuilder()
                    .update(FundTransaction)
                    .set({ transactionStatusId: pendingStatus.id })
                    .where('id = :id', { id: fundTransaction.id })
            );
            // create events
            events.push(
                connection.manager.create(TransactionEvent, {
                    fundTransactionId: fundTransaction.id,
                    name: EventNameValue.PROCESSED,
                    createdBy: userProfileId,
                    updatedBy: userProfileId,
                    userProfileId: userProfileId
                })
            );

            // create divestment detail records
            const inputs = {
                id: fundTransaction.id,
                amount: fundTransaction.amount,
                metadata: fundTransaction.metadata,
                destination: grantDisbursementAccount,
                transactionDateTime: fundTransaction.transactionDateTime,
                userProfileId: userProfileId
            };

            divestmentCreationPromises.push(
                createDivestmentDetails(connection.manager, fundTransaction.fund, inputs)
            );

            cashOutDetails.push(
                connection.manager.create(FundTransactionDetail, {
                    fundTransactionId: fundTransaction.id,
                    transactionDetailTypeId: cashOutType.id,
                    transactionDetailStatusId: detailPendingStatus.id,
                    destinationAccountId: feeExpenseAccount.id,
                    sourceAccountId: grantDisbursementAccount.id,
                    amount: fundTransaction.amount
                })
            );
        });

        transactionsWithoutFunding.forEach(transaction => (transaction.onHold = true));
        try {
            await connection.getRepository(FundTransaction).save(transactionsWithoutFunding);
        } catch (error) {
            console.log('error placing records on hold:', error);
            return true;
        }

        let divestmentDetails: FundTransactionDetail[][];
        let errorCreatingDivestments = false;
        try {
            divestmentDetails = await Promise.all(divestmentCreationPromises);
        } catch (error) {
            // most likely occurred because the Investment has insufficient funds
            console.log('error creating detail records:', error);
            errorCreatingDivestments = true;
        }

        // return early if we didn't create the divestment records
        if (errorCreatingDivestments) {
            return true;
        }

        // update status on Fund Transaction
        await Promise.all(updateStatusQueries.map(query => query.execute()));

        // update detail records and add events
        await Promise.all([
            connection
                .getRepository(FundTransactionDetail)
                .insert([...flatten(divestmentDetails), ...cashOutDetails]),
            connection.getRepository(TransactionEvent).insert(events)
        ]);

        return false;
    }

    private processFeesQuery(context: GraphQLContext) {
        return context.typeorm
            .getRepository(FundTransaction)
            .createQueryBuilder('fundTransaction')
            .leftJoinAndSelect('fundTransaction.transactionType', 'transactionType')
            .leftJoinAndSelect('fundTransaction.transactionStatus', 'transactionStatus')
            .leftJoinAndSelect('fundTransaction.fund', 'fund')
            .leftJoinAndSelect('fund.investments', 'fundInvestments')
            .leftJoinAndSelect('fundInvestments.investment', 'investment')
            .leftJoinAndSelect('investment.glAccount', 'glAccount')
            .where('transactionType.name IN (:...types)', {
                types: this.getFeeTransactionTypes()
            })
            .andWhere('transactionStatus.name = :name', { name: TransactionStatusValue.SUBMITTED })
            .andWhere('fundTransaction.onHold = FALSE');
    }

    @Mutation(type => ProcessFeeResponse)
    async processFees(
        @Ctx() context: GraphQLContext,
        @Arg('omittedIds', type => [String]) omittedIds: string[]
    ): Promise<ProcessFeeResponse> {
        const fundTransactionQuery = this.processFeesQuery(context);
        if (omittedIds.length) {
            fundTransactionQuery.andWhere('fundTransaction.id NOT IN (:...ids)', {
                ids: omittedIds
            });
        }

        const [fundTransactions, userProfile] = await Promise.all([
            fundTransactionQuery.getMany(),
            this.getCurrentUserProfile(context)
        ]);

        const hasError = await this.processFundTransactionFees(
            context.typeorm,
            fundTransactions,
            userProfile.id
        );

        return Promise.resolve({
            errorMessage: hasError
                ? 'Some fees could not be processed due to insufficient fund balances'
                : undefined,
            success: !hasError
        });
    }

    @Mutation(type => Boolean)
    async batchFees(
        @Ctx() context: GraphQLContext,
        @Arg('omittedIds', type => [String]) omittedIds: string[]
    ): Promise<boolean> {
        // fetch PENDING fees where the divestment detail record is COMPLETE OR any ol' CASH_OUT record
        const fundTransactionQuery = context.typeorm
            .getRepository(FundTransaction)
            .createQueryBuilder('fundTransaction')
            .leftJoinAndSelect('fundTransaction.transactionType', 'transactionType')
            .leftJoin('fundTransaction.transactionStatus', 'transactionStatus')
            .leftJoinAndSelect('fundTransaction.transactionDetails', 'details')
            .leftJoin('details.transactionDetailStatus', 'detailStatus')
            .leftJoinAndSelect('details.transactionDetailType', 'detailType')
            .where('transactionType.name IN (:...types)', { types: this.getFeeTransactionTypes() })
            .andWhere('transactionStatus.name = :pending', {
                pending: TransactionStatusValue.PENDING
            })
            .andWhere(this.getDetailCashOutBrackets())
            .andWhere(qb => this.getDivestmentSubQuery(qb, 'fundTransaction'));

        if (omittedIds.length > 0) {
            fundTransactionQuery.andWhere('fundTransaction.id NOT IN (:...ids)', {
                ids: omittedIds
            });
        }

        const fundTransactions = await fundTransactionQuery.getMany();

        // we batch by fee type
        const cashOutDetailsByFeeType: FundTransactionDetail[][] = fundTransactions.reduce(
            (acc, transaction) => {
                const { name } = transaction.transactionType;

                // only batch cash out detail records
                const cashOutDetails = transaction.transactionDetails.filter(detail => {
                    return detail.transactionDetailType.name === TransactionDetailTypeName.CASH_OUT;
                });

                if (name === TransactionTypeValue.ADMINISTRATION_FEE) {
                    acc[0].push(...cashOutDetails);
                } else if (name === TransactionTypeValue.INVESTMENT_FEE) {
                    acc[1].push(...cashOutDetails);
                }

                return acc;
            },
            [[], []]
        );

        const glAccountRepo = context.typeorm.getCustomRepository(GLAccountRepository);
        const [disbursementAccount, adminFeeAccount] = await Promise.all([
            glAccountRepo.getByType(GLAccountTypeName.GRANT_DISBURSEMENT),
            glAccountRepo.getByType(GLAccountTypeName.ADMIN_FEE)
        ]);

        await Promise.all(
            cashOutDetailsByFeeType.map(transactions => {
                if (transactions.length) {
                    return context.typeorm
                        .getCustomRepository(BatchRepository)
                        .createBatchForTransactions(
                            transactions,
                            disbursementAccount.id,
                            adminFeeAccount.id
                        );
                }
                return null;
            })
        );

        return true;
    }

    @Mutation(type => FundTransaction)
    async batchFee(
        @Ctx() context: GraphQLContext,
        @Arg('id', type => String) id: string
    ): Promise<FundTransaction> {
        const fundTransactionQuery = context.typeorm
            .getRepository(FundTransaction)
            .createQueryBuilder('fundTransaction')
            .leftJoinAndSelect('fundTransaction.transactionType', 'transactionType')
            .leftJoin('fundTransaction.transactionStatus', 'transactionStatus')
            .leftJoinAndSelect('fundTransaction.transactionDetails', 'details')
            .leftJoin('details.transactionDetailStatus', 'detailStatus')
            .leftJoinAndSelect('details.transactionDetailType', 'detailType')
            .where('transactionType.name IN (:...types)', { types: this.getFeeTransactionTypes() })
            .andWhere('transactionStatus.name = :pending', {
                pending: TransactionStatusValue.PENDING
            })
            .andWhere('fundTransaction.id = :id', { id })
            .andWhere(this.getDetailCashOutBrackets())
            .andWhere(qb => this.getDivestmentSubQuery(qb, 'fundTransaction'));

        const fundTransaction = await fundTransactionQuery.getOne();

        // only batch cash out detail records
        const cashOutDetails = fundTransaction.transactionDetails.filter(detail => {
            return detail.transactionDetailType.name === TransactionDetailTypeName.CASH_OUT;
        });

        const glAccountRepo = context.typeorm.getCustomRepository(GLAccountRepository);
        const [disbursementAccount, adminFeeAccount] = await Promise.all([
            glAccountRepo.getByType(GLAccountTypeName.GRANT_DISBURSEMENT),
            glAccountRepo.getByType(GLAccountTypeName.ADMIN_FEE)
        ]);

        if (cashOutDetails.length) {
            await context.typeorm
                .getCustomRepository(BatchRepository)
                .createBatchForTransactions(
                    cashOutDetails,
                    disbursementAccount.id,
                    adminFeeAccount.id
                );
        }

        return await context.typeorm.getRepository(FundTransaction).findOne(id);
    }

    @Mutation(type => ProcessFeeResponse)
    async processFee(
        @Ctx() context: GraphQLContext,
        @Arg('id', type => String) id: string
    ): Promise<ProcessFeeResponse> {
        const fundTransactionPromise = context.typeorm.getRepository(FundTransaction).findOne({
            where: { id },
            relations: [
                'transactionType',
                'transactionStatus',
                'fund',
                'fund.investments',
                'fund.investments.investment',
                'fund.investments.investment.glAccount'
            ]
        });

        const [fundTransaction, userProfile] = await Promise.all([
            fundTransactionPromise,
            this.getCurrentUserProfile(context)
        ]);

        const hasError = await this.processFundTransactionFees(
            context.typeorm,
            [fundTransaction],
            userProfile.id
        );

        if (hasError) {
            return {
                success: false,
                errorMessage: 'The fee could not be processed due to insufficient fund balances'
            };
        } else {
            return {
                success: true,
                data: await context.typeorm.getRepository(FundTransaction).findOne(id)
            };
        }
    }

    private async cancelFundTransactionFees(
        connection: Connection,
        fundTransactions: FundTransaction[],
        userProfileId: string
    ): Promise<void> {
        const eventRepo = connection.getRepository(TransactionEvent);

        // gather data
        const canceledStatus = await connection
            .getRepository(TransactionStatus)
            .findOne({ where: { name: TransactionStatusValue.CANCELED }, select: ['id'] });

        const events: TransactionEvent[] = fundTransactions.map(fee => {
            return eventRepo.create({
                fundTransactionId: fee.id,
                name: EventNameValue.CANCELED,
                createdBy: userProfileId,
                updatedBy: userProfileId,
                userProfileId: userProfileId
            });
        });

        const update = connection
            .createQueryBuilder()
            .update(FundTransaction)
            .set({ transactionStatusId: canceledStatus.id })
            .where('id IN (:...ids)', { ids: fundTransactions.map(ft => ft.id) });

        await Promise.all([update.execute(), eventRepo.save(events)]);

        return Promise.resolve();
    }

    @Mutation(type => Boolean)
    async cancelFee(
        @Ctx() context: GraphQLContext,
        @Arg('code', type => String) code: string
    ): Promise<boolean> {
        // gather data
        const [userProfile, fee] = await Promise.all([
            this.getCurrentUserProfile(context),
            context.typeorm.getRepository(FundTransaction).findOne({ transactionCode: code })
        ]);

        await this.cancelFundTransactionFees(context.typeorm, [fee], userProfile.id);

        return true;
    }

    @Mutation(type => Boolean)
    async cancelFees(
        @Ctx() context: GraphQLContext,
        @Arg('omittedIds', type => [String]) omittedIds: string[]
    ): Promise<boolean> {
        const fundTransactionQuery = context.typeorm
            .getRepository(FundTransaction)
            .createQueryBuilder('fundTransaction')
            .leftJoinAndSelect('fundTransaction.transactionType', 'transactionType')
            .leftJoinAndSelect('fundTransaction.transactionStatus', 'transactionStatus')
            .where('transactionType.name IN (:...types)', { types: this.getFeeTransactionTypes() })
            .andWhere('transactionStatus.name = :name', { name: TransactionStatusValue.SUBMITTED });

        if (omittedIds.length) {
            fundTransactionQuery.andWhere('fundTransaction.id NOT IN (:...ids)', {
                ids: omittedIds
            });
        }

        // gather data
        const [userProfile, fees] = await Promise.all([
            this.getCurrentUserProfile(context),
            fundTransactionQuery.getMany()
        ]);

        await this.cancelFundTransactionFees(context.typeorm, fees, userProfile.id);

        return true;
    }
}
