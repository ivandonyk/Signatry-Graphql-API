import dayjs from 'dayjs';
import { camelCase, sumBy, startCase } from 'lodash';
import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { SelectQueryBuilder } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import NotPermittedError from '../errors/NotPermitted';
import { CreateFundContributionInput } from '../inputs/FundTransaction/CreateFundContributionInput';
import { CreateGrantRecommendationInput } from '../inputs/FundTransaction/CreateGrantRecommendationInput';
import { EditGrantRecommendationInput } from '../inputs/FundTransaction/EditGrantRecommendationInput';
import { FundTransactionFilter } from '../inputs/FundTransaction/FundTransactionFilter';
import { FundTransactionOrderBy } from '../inputs/FundTransaction/FundTransactionOrderBy';
import { TransactionDetailCustomFilter } from '../inputs/FundTransactionDetail/FundTransactionDetailCustomFilter';
import { TransactionDetailFilter } from '../inputs/FundTransactionDetail/FundTransactionDetailFilter';
import { FundTransactionAdminFilter } from '../inputs/FundTransaction/FundTransactionAdminFilter';
import { FundTransactionDetailOrderBy } from '../inputs/FundTransactionDetail/FundTransactionDetailOrderBy';
import { CreateFundTransferInput } from '../inputs/FundTransfer/CreateFundTransferInput';
import { UpdateFundTransferInput } from '../inputs/FundTransfer/UpdateFundTransferInput';
import { RecurringGrantInput } from '../inputs/Grant/RecurringGrantInput';
import { InvestmentInput } from '../inputs/Investment/InvestmentInput';
import { TransactionPaymentFilter } from '../inputs/TransactionPayment/TransactionPaymentFIlter';
import { TransactionPaymentOrderBy } from '../inputs/TransactionPayment/TransactionPaymentOrderBy';
import {
    AdminGrantsByStatusResult,
    FilterValueResults,
    Fund,
    FundTransaction,
    FundTransactionDetail,
    FundTransactionInfo,
    FundTransactionResults,
    FundUserProfile,
    InstitutionAccountTransaction,
    Role,
    Security,
    Tenant,
    TransactionDetailStatus,
    TransactionDetailType,
    TransactionEvent,
    TransactionPayment,
    TransactionPaymentResults,
    TransactionRecurrence,
    TransactionStatus,
    TransactionType,
    UserProfile,
    UserProfileAccount,
    UserProfileRole
} from '../models';
import { FundsCheckResponse } from '../models/FeesResponse';
import { FilterTypeResults, FilterValue, MoneyMovementTypes, GrantFilterTypes, ContributionsFilterTypes } from '../models/FilterValueResults';
import { FundRoleNameValues } from '../models/FundRole';
import { DetailPaymentType } from '../models/FundTransactionDetail';
import {
    FundTransactionDetailResults,
    FundTransactionDetailSummaryResults
} from '../models/FundTransactionDetailResults';
import { ProposedDetailsMeta } from '../models/FundTransactionMetadata';
import { PaymentInformationResults } from '../models/FundTransactionResults';
import { GLAccountTypeName } from '../models/GLAccountType';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { RoleTypeValues } from '../models/Role';
import { TransactionDetailStatusValue } from '../models/TransactionDetailStatus';
import { TransactionDetailTypeName } from '../models/TransactionDetailType';
import { EventNameValue } from '../models/TransactionEvent';
import { TransactionStatusValue } from '../models/TransactionStatus';
import { TransactionTypeValue } from '../models/TransactionType';
import { FundRepository } from '../repositories/Fund';
import { GLAccountRepository } from '../repositories/GLAccount';
import { createContribution } from '../utilities/createContribution';
import {
    createInfoRecord,
    createRecurrenceRecord,
    extractGrantPropertiesFromInput
} from '../utilities/createGrant';
import { createSingleGrantPaymentDetail } from '../utilities/createSingleGrantPaymentDetail';
import { currency, numberFromCurrencyString, stringIsCurrency } from '../utilities/currency';
import { getStartAndEndOfDay, stringIsdate } from '../utilities/datetime';
import { setToMidday } from '../utilities/determineIfFutureGrant';
import { fundsWithoutBalanceFromFundTransactions } from '../utilities/fees';
import { capitalizationFormatter } from '../utilities/format';
import {
    convertRRuleFromString,
    convertRRuleToHumanReadable,
    createRRule
} from '../utilities/getRruleForRecurringActions';
import { isTCode } from '../utilities/transactionCode';
import { createProposedDetails } from '../utilities/transactionDetail';
import {
    createTransfer,
    startableTransfersQuery,
    startTransfer,
    startTransfers,
    TransferType,
    updateTransfer
} from '../utilities/transfers';
import { UtilityResolver } from './core/UtilityResolver';

@Resolver(type => FundTransaction)
export class FundTransactionResolver extends UtilityResolver {
    @Query(type => [FundTransaction])
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.READ)
    public async getTransactionsForFund(
        @Ctx() context: GraphQLContext,
        @Arg('transactionType', type => TransactionTypeValue) transactionType: TransactionTypeValue,
        @Arg('fundId', type => String, { nullable: true }) fundId?: string,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('limit', type => Int, { nullable: true }) limit?: number
    ): Promise<FundTransaction[]> {
        const ftRepo = context.typeorm.getRepository(FundTransaction);

        const [profile, transactionTypeRec] = await Promise.all([
            this.getCurrentUserProfile(context),
            context.typeorm.manager.findOne(TransactionType, {
                name: transactionType
            })
        ]);

        const query = ftRepo.createQueryBuilder('ft').where('ft.transactionTypeId = :typeId', {
            typeId: transactionTypeRec.id
        });

        // fund clause
        if (fundId) {
            query.andWhere('ft.fundId = :fundId', {
                fundId
            });
        } else {
            query
                .leftJoinAndSelect('ft.fund', 'f')
                .leftJoinAndSelect('f.fundUserProfiles', 'fup')
                .leftJoin('fup.fundRole', 'fundRole')
                .andWhere('fup.userProfileId = :profileId', {
                    profileId: profile.id
                })
                .andWhere('fundRole.name != :noAccess', { noAccess: FundRoleNameValues.NO_ACCESS });
        }
        // order by
        if (orderBy) {
            for (const propName in orderBy) {
                const propValue = orderBy[propName];

                if (typeof propValue !== 'object') {
                    this.addBasicOrderBy(query, 'ft', propName, propValue);
                    continue;
                }
            }
        }
        // limit
        if (limit) query.limit(limit);

        return await query.getMany();
    }

    @Query(type => FundTransactionResults)
    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    public async adminFundTransactions(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<FundTransactionResults> {
        const repo = context.typeorm.getRepository(FundTransaction);

        // query to get paginated results
        const dataQuery = this.createQuery(repo, where, orderBy, skip, take, search);
        // query to get total results count
        const countQuery = this.createQuery(repo, where, null, null, null, search, false);
        const totalCountQuery = this.createQuery(repo, where);

        const [
            [{ current_timestamp: timestamp }],
            data,
            [countResults, count],
            totalCount
        ] = await Promise.all([
            context.typeorm.query('SELECT CURRENT_TIMESTAMP'),
            dataQuery.getMany(),
            countQuery.getManyAndCount(),
            totalCountQuery.getCount()
        ]);

        return {
            timestamp,
            data,
            count,
            totalCount,
            totalAmount: countResults.reduce((acc, val) => currency.add(acc, val.amount), 0)
        };
    }

    // Admin fund transactions query (contributions)
    @Query(type => FundTransactionResults)
    @PermissionLock(PermissionAccessType.ADMIN_CONTRIBUTIONS, PermissionAccessLevel.READ)
    public async adminFundContributions(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('filters', type => FundTransactionAdminFilter, { nullable: true })
        filters?: FundTransactionAdminFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<FundTransactionResults> {
        const repo = context.typeorm.getRepository(FundTransaction);
        const conditions = {
            ...where,
            transactionType: {
                name: 'CONTRIBUTION'
            }
        };
        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, search);
        // query to get total results count
        const countQuery = this.createQuery(repo, conditions, null, null, null, search);
        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        if(filters) {
            this.applyFundTransactionAdminFilters([dataQuery, countQuery], filters)
        }

        return {
            timestamp,
            data: await dataQuery.getMany(),
            count: await countQuery.getCount()
        };
    }

    @Query(type => FundTransaction)
    @PermissionLock(PermissionAccessType.ADMIN_CONTRIBUTIONS, PermissionAccessLevel.READ)
    async contribution(
        @Ctx() context: GraphQLContext,
        @Arg('ID', type => String) ID: string
    ): Promise<FundTransaction> {
        const query = context.typeorm
            .getRepository(FundTransaction)
            .createQueryBuilder('ft')
            .leftJoinAndSelect('ft.transactionDetails', 'ftd')
            .leftJoinAndSelect('ftd.transactionDetailType', 'detailType')
            .leftJoinAndSelect('ftd.batch', 'batch')
            .where('ft.id = :id', { id: ID });

        return await query.getOne();
    }

    @Query(type => PaymentInformationResults)
    @PermissionLock(PermissionAccessType.ADMIN_CONTRIBUTIONS, PermissionAccessLevel.READ)
    async transactionPaymentInformation(
        @Ctx() context: GraphQLContext,
        @Arg('id', type => String) id: string,
        @Arg('detailFilter', type => TransactionDetailFilter)
        detailFilter: TransactionDetailFilter
    ): Promise<PaymentInformationResults> {
        const query = context.typeorm
            .getRepository(FundTransaction)
            .createQueryBuilder('ft')
            .leftJoinAndSelect('ft.transactionDetails', 'ftd')
            .leftJoinAndSelect('ftd.transactionDetailType', 'detailType')
            // batch
            .leftJoinAndSelect('ftd.batch', 'batch')
            // GL Accounts
            .leftJoinAndSelect('batch.sourceGLAccount', 'source')
            .leftJoinAndSelect('batch.destinationGLAccount', 'destination')
            // IA accounts
            .leftJoinAndSelect('source.institutionAccount', 'sourceIA')
            .leftJoinAndSelect('destination.institutionAccount', 'destinationIA')
            .where('ft.id = :id', { id })
            .andWhere('detailType.name = :name', {
                name: detailFilter.transactionDetailType.name
            });

        const [fundTransaction, [{ current_timestamp: timestamp }]] = await Promise.all([
            query.getOne(),
            context.typeorm.query('SELECT CURRENT_TIMESTAMP')
        ]);

        // deconstruct details
        const paymentType = fundTransaction.metadata?.paymentDetails
            ? fundTransaction.metadata.paymentDetails.paymentType
            : null;
        const securityId = fundTransaction.metadata?.paymentDetails
            ? fundTransaction.metadata.paymentDetails.securityId
            : null;

        // fetch security and IA transaction

        const securityPromise = context.typeorm
            .getRepository(Security)
            .findOne(securityId)
            .catch(() => {
                /**
                 * we can't guarantee imported historic contributions have a valid security id,
                 * so attempt to extract from metadata
                 * */
                return {
                    // falsify id
                    id: fundTransaction.metadata?.paymentDetails?.cusip,
                    cusip: fundTransaction.metadata?.paymentDetails?.cusip,
                    tickerSymbol: fundTransaction.metadata?.paymentDetails?.tickerSymbol,
                    name: fundTransaction.metadata?.paymentDetails?.securityName
                } as Security;
            });
        const transactionPromise = fundTransaction.transactionDetails[0].batchId
            ? context.typeorm.getRepository(InstitutionAccountTransaction).findOne({
                  where: { batchId: fundTransaction.transactionDetails[0].batchId },
                  relations: ['institutionAccount']
              })
            : undefined;

        const [security, transaction] = await Promise.all([
            paymentType === DetailPaymentType.SECURITY ? securityPromise : undefined,
            transactionPromise
        ]);

        return { fundTransaction, timestamp, security, transaction };
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => FundTransactionResults)
    public async getGrantHistoryByFundCode(
        @Ctx() context: GraphQLContext,
        @Arg('fundCode', type => String, { nullable: true }) fundCode?: string,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string,
        @Arg('includeCanceled', type => Boolean, { nullable: true })
        includeCanceled?: boolean
    ): Promise<FundTransactionResults> {
        let error = false;
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const userProfileRoleRepo = context.typeorm.getRepository(UserProfileRole);
        const userProfileRole = await userProfileRoleRepo.findOne({
            userProfileId: profile.id
        });
        const roleRepo = context.typeorm.getRepository(Role);
        const contextUserRole = await roleRepo.findOne(userProfileRole.roleId);

        if (fundCode) {
            const fundUserProfile = await context.typeorm.manager
                .createQueryBuilder(FundUserProfile, 'fundUserProfile')
                .leftJoin('fundUserProfile.fund', 'fund')
                .leftJoin('fundUserProfile.userProfile', 'userProfile')
                .leftJoin('fundUserProfile.fundRole', 'fundRole')
                .where('fund.fundCode = :fundCode', { fundCode })
                .andWhere('userProfile.id = :userProfileId', { userProfileId: profile.id })
                .andWhere('fundRole.name != :noAccess', {
                    noAccess: FundRoleNameValues.NO_ACCESS
                })
                .getOne();
            if (!fundUserProfile) {
                error = true;
            }
        }

        const repo = context.typeorm.getRepository(FundTransaction);
        const conditions = { ...where };
        conditions.transactionType = {
            name: TransactionTypeValue.GRANT
        };

        if (
            contextUserRole.name !== RoleTypeValues.DONOR &&
            contextUserRole.name !== RoleTypeValues.CHARITY
        ) {
            conditions.fund = {
                ...conditions?.fund
            };
        } else {
            conditions.fund = {
                ...conditions?.fund,
                fundUserProfiles: {
                    ...conditions?.fund?.fundUserProfiles,
                    userProfileId: profile.id
                }
            };
        }

        if (fundCode) {
            conditions.fund = {
                ...conditions?.fund,
                fundCode
            };
        }
        // Include complete in count

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, search);
        // query to get total results count
        const countQuery = this.createQuery(repo, conditions, null, null, null, search, false);

        if (includeCanceled) {
            dataQuery
                .leftJoinAndSelect('entity.transactionStatus', 'ts')
                .andWhere('ts.name IN (:...names)', {
                    names: includeCanceled
                        ? [
                              TransactionStatusValue.COMPLETE,
                              TransactionStatusValue.CANCELED,
                              TransactionStatusValue.DENIED,
                              TransactionStatusValue.PAID
                          ]
                        : [TransactionStatusValue.COMPLETE, TransactionStatusValue.PAID]
                });
            countQuery
                .leftJoinAndSelect('entity.transactionStatus', 'ts')
                .andWhere('ts.name IN (:...names)', {
                    names: includeCanceled
                        ? [
                              TransactionStatusValue.COMPLETE,
                              TransactionStatusValue.CANCELED,
                              TransactionStatusValue.DENIED,
                              TransactionStatusValue.PAID
                          ]
                        : [TransactionStatusValue.COMPLETE, TransactionStatusValue.PAID]
                });
        }

        if (!fundCode) {
            [dataQuery, countQuery].forEach(query => {
                this.builderRelationUniquenessChecker(
                    query,
                    'fund.fundUserProfiles',
                    'fundUserProfiles'
                );

                query
                    .leftJoin('fundUserProfiles.fundRole', 'fundRole')
                    .andWhere('fundRole.name != :noAccess', {
                        noAccess: FundRoleNameValues.NO_ACCESS
                    });
            });
        }

        if (orderBy && orderBy.grantPaymentStatus) {
            const type = await context.typeorm.manager
                .getRepository(TransactionDetailType)
                .findOne({ where: { name: 'CASH_OUT' } });

            dataQuery
                .leftJoinAndSelect(
                    'entity.transactionDetails',
                    'grantPaymentDetail',
                    `grantPaymentDetail.transactionDetailTypeId = '${type.id}'`
                )
                .leftJoinAndSelect(
                    'grantPaymentDetail.transactionDetailStatus',
                    'grantPaymentStatus'
                )
                .orderBy('grantPaymentStatus.name', orderBy.grantPaymentStatus);
        }

        
        const sumQueryResult = await context.typeorm.manager.query(/*sql*/ `
                SELECT sum(amount)
                FROM (
                    SELECT amount
                    FROM fund_transaction
                    LEFT JOIN transaction_type ON fund_transaction.transaction_type_id = transaction_type.id
                    LEFT JOIN transaction_status ON fund_transaction.transaction_status_id = transaction_status.id
                    LEFT JOIN fund ON fund_transaction.fund_id = fund.id
                    LEFT JOIN fund_user_profile ON fund_transaction.fund_id  = fund_user_profile.fund_id
                    LEFT JOIN fund_role ON fund_user_profile.fund_role_id = fund_role.id
                    WHERE transaction_type.name = '${TransactionTypeValue.GRANT}'
                    AND transaction_status.name = '${TransactionStatusValue.COMPLETE}'
                    AND fund_user_profile.user_profile_id = '${profile.id}'
                    AND fund_role.name != '${FundRoleNameValues.NO_ACCESS}'
                    ${fundCode ? `AND fund.fund_code = '${fundCode}'` : ''}
                    GROUP BY fund_transaction.id
                ) transactions
            `);

        const [{ sum }] = sumQueryResult;

        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );
        return {
            timestamp,
            data: await dataQuery.getMany(),
            count: await countQuery.getCount(),
            totalAmount: sum || 0
        };
    }

    @Query(type => TransactionPaymentResults)
    public async getTransactionPayments(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: TransactionPaymentOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => TransactionPaymentFilter, { nullable: true })
        where?: TransactionPaymentFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<TransactionPaymentResults> {
        const repo = context.typeorm.getRepository(TransactionPayment);
        const conditions = {
            ...where
        };
        
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, search);

        const countQuery = this.createQuery(repo, conditions, null, null, null, search, false);
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );
        return {
            timestamp,
            data: await dataQuery.getMany(),
            count: await countQuery.getCount()
        };
    }

    @Query(type => [FundTransaction])
    public async getTransactionFileLineItems(
        @Ctx() context: GraphQLContext,
        @Arg('transactionPaymentId') transactionPaymentId?: string
    ): Promise<FundTransaction[]> {
        return context.typeorm.manager
            .createQueryBuilder(FundTransaction, 'ft')
            .leftJoinAndSelect('ft.fund', 'fund')
            .leftJoinAndSelect('ft.transactionDetails', 'ftd')
            .leftJoinAndSelect('ftd.batch', 'batch')
            .where('ft.transactionPaymentId = :transactionPaymentId', { transactionPaymentId })
            .getMany();
    }

    @Query(type => FundTransactionResults)
    public async adminFundTransactionsByFundId(
        @Ctx() context: GraphQLContext,
        @Arg('fundId', type => String, { nullable: false }) fundId: string,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string,
        @Arg('tzOffset', type => Int, { nullable: true }) tzOffset?: number
    ): Promise<FundTransactionResults> {
        const profile = await this.getCurrentUserProfile(context);
        const fundUserProfile = await context.typeorm.manager
            .createQueryBuilder(FundUserProfile, 'fundUserProfile')
            .leftJoin('fundUserProfile.fund', 'fund')
            .leftJoin('fundUserProfile.userProfile', 'userProfile')
            .where('fund.id = :fundId', { fundId })
            .andWhere('userProfile.id = :userProfileId', { userProfileId: profile.id })
            .getOne();

        const userIsAuthorized = (await this.getPermissionList(context)).some(permission => {
            return (
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
            );
        });

        if (!fundUserProfile && !userIsAuthorized) {
            throw new NotPermittedError("You don't have sufficient privileges");
        } else {
            const repo = context.typeorm.getRepository(FundTransaction);

            const conditions = {
                ...where,
                fund: {
                    ...where?.fund,
                    id: fundId
                }
            };

            const isDate = stringIsdate(search || '');
            const isCode = isTCode(search || '');
            const isAmount = stringIsCurrency(search || '');

            const searchTerm = isDate || isCode || isAmount ? null : search;

            // query to get paginated results
            const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, searchTerm);
            // query to get total results count
            const countQuery = this.createQuery(repo, conditions, null, null, null, searchTerm, false);
            // query to get current timestamp
            const [{ current_timestamp: timestamp }] = await context.typeorm.query(
                'SELECT CURRENT_TIMESTAMP'
            );

            if (searchTerm === null) {
                [dataQuery, countQuery].forEach(query => {
                    if (tzOffset && isDate) {
                        const { startOfDay, endOfDay } = getStartAndEndOfDay(search, tzOffset);
                        query.andWhere(
                            'entity.transaction_date_time BETWEEN :startOfDay::timestamp AND :endOfDay::timestamp',
                            { startOfDay, endOfDay }
                        );
                    } else if (isCode) {
                        query.andWhere('LOWER(entity.transactionCode) LIKE LOWER(:searchTerm)', {
                            searchTerm: `%${search}%`
                        });
                    } else if (isAmount) {
                        query.andWhere(
                            'ABS(entity.amount) = CAST(:searchAmount AS DOUBLE PRECISION)',
                            {
                                searchAmount: numberFromCurrencyString(search)
                            }
                        );
                    }
                });
            }

            return {
                timestamp,
                data: await dataQuery.getMany(),
                count: await countQuery.getCount()
            };
        }
    }

    // User fund transactions query (contributions)
    @Query(type => FundTransactionResults)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    public async userFundContributions(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string,
        @Arg('profileId', type => String, { nullable: true }) profileId?: string
    ): Promise<FundTransactionResults> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const repo = context.typeorm.getRepository(FundTransaction);

        const isAdmin = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        const profileRestriction = !!profileId && isAdmin ? profileId : null;

        const conditions = {
            ...where,
            transactionType: {
                name: TransactionTypeValue.CONTRIBUTION
            },
            fund: {
                // include any provided fund where conditions
                ...where?.fund,
                // only allow user to query transactions on funds they're associated with,
                // unless user is admin
                ...(!isAdmin ? { userProfiles: { id: profile.id } } : {})
            },
            userProfile: {
                ...where?.userProfile,
                ...(!!profileRestriction ? { id: profileId } : {})
            }
        };

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, search);
        // query to get total results count
        const countQuery = this.createQuery(repo, conditions, null, null, null, search, false);
        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        dataQuery
            .leftJoinAndSelect('entity.transactionStatus', 'ts')
            .andWhere('ts.name IN (:...names)', {
                names: [
                    TransactionStatusValue.COMPLETE,
                    TransactionStatusValue.CANCELED,
                    TransactionStatusValue.DENIED
                ]
            });
        countQuery
            .leftJoinAndSelect('entity.transactionStatus', 'ts')
            .andWhere('ts.name IN (:...names)', {
                names: [
                    TransactionStatusValue.COMPLETE,
                    TransactionStatusValue.CANCELED,
                    TransactionStatusValue.DENIED
                ]
            });

        if (!isAdmin) {
            [dataQuery, countQuery].forEach(query => {
                query
                    .leftJoin('fund.fundUserProfiles', 'fundUserProfiles')
                    .leftJoin('fundUserProfiles.fundRole', 'fundRole')
                    .andWhere('fundUserProfiles.userProfileId = :userProfileId', {
                        userProfileId: profile.id
                    })
                    .andWhere('fundRole.name != :noAccess', {
                        noAccess: FundRoleNameValues.NO_ACCESS
                    });
            });
        }

        if (orderBy && orderBy.feeTransaction) {
            const type = await context.typeorm.manager
                .getRepository(TransactionDetailType)
                .findOne({ where: { name: 'FEE' } });

            const [field] = Object.keys(orderBy.feeTransaction);

            dataQuery
                .leftJoinAndSelect(
                    'entity.transactionDetails',
                    'feeTransaction',
                    `feeTransaction.transactionDetailTypeId = '${type.id}'`
                )
                .orderBy(`feeTransaction.${field}`, orderBy.feeTransaction[field]);
        }

        const sumQueryResult = await context.typeorm.manager.query(/*sql*/ `
            SELECT sum(amount)
            FROM (
                SELECT amount
                FROM fund_transaction
                LEFT JOIN transaction_type ON fund_transaction.transaction_type_id = transaction_type.id
                LEFT JOIN transaction_status ON fund_transaction.transaction_status_id = transaction_status.id
                LEFT JOIN fund ON fund_transaction.fund_id = fund.id
                LEFT JOIN fund_user_profile ON fund_transaction.fund_id  = fund_user_profile.fund_id
                LEFT JOIN fund_role ON fund_user_profile.fund_role_id = fund_role.id
                WHERE transaction_type.name = '${TransactionTypeValue.CONTRIBUTION}'
                AND transaction_status.name = '${TransactionStatusValue.COMPLETE}'
                ${
                    !isAdmin
                        ? `AND fund_user_profile.user_profile_id = '${profile.id}' AND fund_role.name != '${FundRoleNameValues.NO_ACCESS}'`
                        : where?.fund?.userProfiles?.id
                        ? `AND fund_user_profile.user_profile_id = '${where?.fund?.userProfiles?.id}' AND fund_role.name != '${FundRoleNameValues.NO_ACCESS}'`
                        : ''
                }
                ${where?.fund?.id ? `AND fund.id = '${where.fund.id}'` : ''}
                ${
                    !!profileRestriction
                        ? `AND fund_transaction.user_profile_id = '${profileRestriction}'`
                        : ''
                }
                GROUP BY fund_transaction.id
            ) transactions
        `);

        const [{ sum }] = sumQueryResult;

        return {
            timestamp,
            data: await dataQuery.getMany(),
            count: await countQuery.getCount(),
            totalAmount: sum || 0
        };
    }

    @Query(type => FundTransaction)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    public async userFundContributionById(
        @Ctx() context: GraphQLContext,
        @Arg('contributionId', type => String, { nullable: false }) contributionId: string
    ): Promise<FundTransaction> {
        const repo = context.typeorm.getRepository(FundTransaction);
        const contributionDetail = await repo
            .createQueryBuilder('fundTransaction')
            .where('fundTransaction.id = :id', { id: contributionId })
            .getOne();

        return contributionDetail;
    }

    // User fund transactions query (contributions)
    @Query(type => FundTransactionResults)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    public async getYTDFundTotalContributions(
        @Ctx() context: GraphQLContext,
        @Arg('fundId', type => String, { nullable: true }) fundId?: string
    ): Promise<FundTransactionResults> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const today = dayjs();
        const startOfYear = dayjs()
            .startOf('year')
            .format('YYYY-MM-DD');

        // create 2 queries
        const [countQuery, totalQuery] = [
            context.typeorm.getRepository(FundTransaction).createQueryBuilder('fundTransaction'),
            context.typeorm.getRepository(FundTransaction).createQueryBuilder('fundTransaction')
        ];

        [countQuery, totalQuery].forEach(query => {
            query
                .leftJoinAndSelect('fundTransaction.transactionType', 'transactionType')
                .leftJoin('fundTransaction.transactionStatus', 'transactionStatus')
                .leftJoin('fundTransaction.fund', 'fund')
                // .leftJoin('fund.userProfiles', 'userProfile')
                .leftJoin('fund.fundUserProfiles', 'fundUserProfiles')
                // .leftJoin('fundUserProfiles.userProfile', 'user')
                .leftJoin('fundUserProfiles.fundRole', 'fundRole')
                // YTD
                .where('fundTransaction.createdOn >= :startOfYear', { startOfYear })
                .andWhere('fundTransaction.createdOn <= :today', { today })
                .andWhere('transactionType.name = :contribution', {
                    contribution: TransactionTypeValue.CONTRIBUTION
                });
            // filter by fund
            if (fundId) {
                query.andWhere('fund.id = :fundId', { fundId });
            }
            // filter by user's funds
            else {
                query
                    .andWhere('fundUserProfiles.userProfileId = :userProfileId', {
                        userProfileId: profile.id
                    })
                    .andWhere('fundRole.name != :noAccess', {
                        noAccess: FundRoleNameValues.NO_ACCESS
                    });
            }
        });

        // // only completed transactions
        totalQuery.andWhere('transactionStatus.name = :complete', {
            complete: TransactionStatusValue.COMPLETE
        });

        // fetch
        const [count, totalAmountResults, [{ current_timestamp: timestamp }]] = await Promise.all([
            countQuery.getCount(),
            totalQuery.getMany(),
            context.typeorm.query('SELECT CURRENT_TIMESTAMP')
        ]);

        const totalAmount = totalAmountResults.reduce(
            (acc, fundTransaction) => currency.add(acc, fundTransaction.amount),
            0
        );

        return {
            timestamp,
            totalAmount,
            count
        };
    }

    private applyFundTransactionAdminFilters(queries: SelectQueryBuilder<any>[], filters: FundTransactionAdminFilter) {
        
        if(filters.lessThan) {
            queries.forEach(query => {
                query.andWhere(
                    "CASE WHEN entity.scheduledDate IS NOT NULL THEN date_trunc('day', entity.scheduledDate) < :af_lessThan  ELSE date_trunc('day', entity.createdOn) < :af_lessThan END",
                    { af_lessThan: filters.lessThan }
                )
            })
        }

        if (filters.fund && filters.fund.length) {
            queries.forEach(query => {
                query.innerJoin('entity.fund', 'af_fund')
                query.andWhere('af_fund.id in (:...af_fundIds)', { af_fundIds: filters.fund })
            })
        }

        if (filters.hold && filters.hold.length) {
            queries.forEach(query => {
                query.andWhere('entity.onHold in (:...af_onHold)', {
                    af_onHold: filters.hold.map(v => v === '1')
                })
            })
        }

        if (filters.recipient && filters.recipient.length) {
            queries.forEach(query => {
                query.innerJoin('entity.transactionInfo', 'af_transactionInfo')
                query.innerJoin('af_transactionInfo.recipient', 'af_recipient')
                query.andWhere('af_recipient.id in (:...af_recipientIds)', {
                    af_recipientIds: filters.recipient
                })
            })
        }

        if (filters.status && filters.status.length) {
            queries.forEach(query => {
                query.innerJoin('entity.transactionStatus', 'af_transactionStatus')
                query.andWhere('af_transactionStatus.id in (:...af_statusIds)', {
                    af_statusIds: filters.status
                })
            })
        }

        if (filters.donor && filters.donor.length) {
            queries.forEach(query => {
                query.andWhere('entity.user_profile_id in (:...af_donorIds)', {
                    af_donorIds: filters.donor
                })
            })
        }

        if (filters.type && filters.type.length) {
            queries.forEach(query => {
                query.andWhere('entity.metadata->\'paymentDetails\'->>\'paymentType\' in (:...af_paymentTypes)', {
                    af_paymentTypes: filters.type
                })
            })
        }
    }

    // Admin fund transactions query (grants)
    @Query(type => FundTransactionResults)
    @PermissionLock(PermissionAccessType.ADMIN_DIVESTMENTS, PermissionAccessLevel.READ)
    public async adminFundDivestments(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('filters', type => FundTransactionAdminFilter, { nullable: true })
        filters?: FundTransactionAdminFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<FundTransactionResults> {
        const repo = context.typeorm.getRepository(FundTransaction);

        const conditions = {
            ...where,
            transactionType: {
                name: TransactionTypeValue.GRANT
            }
        };

        const isCode = isTCode(search || '');
        const isAmount = stringIsCurrency(search || '');

        const searchTerm = isCode || isAmount ? null : search;

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, searchTerm, true, '&');
        // query to get total results count
        const countQuery = this.createQuery(repo, conditions, null, null, null, searchTerm, false);
        // query to get total results transaction amount
        const sumQuery = this.createQuery(repo, conditions, null, null, null, searchTerm, false).select('ABS(SUM(amount))', 'totalAmount');

        if (searchTerm === null) {
            [dataQuery, countQuery, sumQuery].forEach(query => {
                if (isCode) {
                    query.andWhere('LOWER(entity.transactionCode) LIKE LOWER(:tCode)', {
                        tCode: `%${search}%`
                    });
                } else if (isAmount) {
                    query.andWhere('ABS(entity.amount) = CAST(:searchAmount AS DOUBLE PRECISION)', {
                        searchAmount: numberFromCurrencyString(search)
                    });
                }
            });
        }

        if(filters) {
            this.applyFundTransactionAdminFilters([dataQuery, countQuery, sumQuery], filters)
        }

        return Promise.all([
            context.typeorm.query('SELECT CURRENT_TIMESTAMP'),
            dataQuery.getMany(),
            countQuery.getCount(),
            sumQuery.getRawOne()
        ]).then(([[{ current_timestamp: timestamp }], data, count, { totalAmount }]) => ({
            timestamp,
            data,
            count,
            totalAmount: totalAmount || 0,
        }));
    }

    // Admin payments grant view query
    @Query(type => FundTransactionResults)
    @PermissionLock(PermissionAccessType.ADMIN_DIVESTMENTS, PermissionAccessLevel.READ)
    public async adminGrantsInPayments(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<FundTransactionResults> {
        const repo = context.typeorm.getRepository(FundTransaction);

        const conditions = {
            ...where,
            transactionType: {
                name: 'GRANT'
            }
        };

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, search);
        // query to get total results count
        const countQuery = this.createQuery(repo, conditions, null, null, null, search, false);
        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        return {
            timestamp,
            data: await dataQuery.getMany(),
            count: await countQuery.getCount()
        };
    }

    // Admin fund transactions query (grants)
    @Query(type => [AdminGrantsByStatusResult])
    @PermissionLock(PermissionAccessType.ADMIN_DIVESTMENTS, PermissionAccessLevel.READ)
    public async adminGrantsCountByStatus(
        @Ctx() context: GraphQLContext
    ): Promise<AdminGrantsByStatusResult[]> {
        const { typeorm } = context;
        const data = await typeorm.query(/*sql*/ `
            SELECT
                transaction_status.name,
                count(*),
                sum(amount)
            FROM fund_transaction
            LEFT JOIN transaction_status
            ON fund_transaction.transaction_status_id = transaction_status.id
            LEFT JOIN transaction_type
            ON fund_transaction.transaction_type_id = transaction_type.id
            WHERE transaction_type.name = '${TransactionTypeValue.GRANT}'
            GROUP BY transaction_status.name;
        `);

        return data.map(elem => {
            const newElem = { ...elem };
            newElem.count = parseInt(newElem.count);
            newElem.sum = parseFloat(newElem.sum);
            return newElem;
        });
    }

    // Admin fund transactions query (grants)
    @Query(type => [AdminGrantsByStatusResult])
    @PermissionLock(PermissionAccessType.ADMIN_FUND_TRANSFERS, PermissionAccessLevel.READ)
    public async adminTransfersCount(
        @Ctx() context: GraphQLContext
    ): Promise<AdminGrantsByStatusResult[]> {
        const { typeorm } = context;
        const data = await typeorm.query(/*sql*/ `
            SELECT
                'ALL' AS "name",
                count(*),
                sum(amount)
            FROM fund_transaction
            LEFT JOIN transaction_status
            ON fund_transaction.transaction_status_id = transaction_status.id
            LEFT JOIN transaction_type
            ON fund_transaction.transaction_type_id = transaction_type.id
            WHERE transaction_type.name = '${TransactionTypeValue.TRANSFER_OUT}'
            GROUP BY transaction_status.name
        `);

        const newCount = await typeorm.query(/* sql */ `
            SELECT
                'NEW' AS "name",
                count(DISTINCT fund_transaction.id),
                sum(fund_transaction.amount)
            FROM fund_transaction
            LEFT JOIN transaction_status
            ON fund_transaction.transaction_status_id = transaction_status.id
            LEFT JOIN transaction_type
            ON fund_transaction.transaction_type_id = transaction_type.id
            WHERE transaction_status.name = '${TransactionStatusValue.SUBMITTED}'
            AND transaction_type.name = '${TransactionTypeValue.TRANSFER_OUT}'
        `);

        const mappedAll: AdminGrantsByStatusResult = data.reduce(
            (accum, elem) => {
                if (elem.count) {
                    const newCount = parseInt(elem.count);
                    accum.count = accum.count + newCount;
                }
                if (elem.sum) {
                    const newSum = parseFloat(elem.sum);
                    accum.sum = accum.sum + newSum;
                }
                return accum;
            },
            {
                name: 'ALL',
                sum: 0,
                count: 0
            }
        );

        const mappedNew: AdminGrantsByStatusResult = newCount.reduce(
            (accum, elem) => {
                if (elem.count) {
                    const newCount = parseInt(elem.count);
                    accum.count = accum.count + newCount;
                }
                if (elem.sum) {
                    const newSum = parseFloat(elem.sum);
                    accum.sum = accum.sum + newSum;
                }
                return accum;
            },
            {
                name: 'NEW',
                sum: 0,
                count: 0
            }
        );

        return [mappedAll, mappedNew];
    }

    // User fund transactions query (grants)
    @Query(type => FundTransactionResults)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    public async userFundDivestments(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<FundTransactionResults> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const repo = context.typeorm.getRepository(FundTransaction);

        const conditions = {
            ...where,
            transactionType: {
                name: 'GRANT'
            },
            fund: {
                // include any provided fund where conditions
                ...where?.fund,
                // only allow user to query transactions on funds they're associated with
                userProfiles: { id: profile.id }
            }
        };

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, search);
        // query to get total results count
        const countQuery = this.createQuery(repo, conditions, null, null, null, search, false);
        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        return {
            timestamp,
            data: await dataQuery.getMany(),
            count: await countQuery.getCount()
        };
    }

    @Query(type => FundTransaction)
    async grantDetails(@Ctx() context: GraphQLContext, @Arg('grantId') grantId: string) {
        const { manager } = context.typeorm;
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const transaction = await manager.getRepository(FundTransaction).findOne(grantId);

        const userFund = await manager
            .createQueryBuilder(Fund, 'fund')
            .leftJoin('fund.fundUserProfiles', 'fundUserProfile')
            .where('fund.id = :fundId', { fundId: transaction.fundId })
            .andWhere('fundUserProfile.userProfileId = :profileId', { profileId: profile.id })
            .getOne();
        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        if (userFund !== undefined || userIsAuthorized) {
            return transaction;
        } else {
            throw new NotPermittedError("You don't have sufficient privileges");
        }
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => String)
    async getHumanReadableRRule(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: RecurringGrantInput
    ): Promise<string> {
        const rruleInput = {
            startDate: input.startOn,
            repeatInterval: input.repeat,
            numberOfRecurrences: input.numberOfRecurrences,
            endDate: input.ends
        };
        const rrule = createRRule(rruleInput);
        return convertRRuleToHumanReadable(rrule);
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => String)
    async getHumanReadableRRuleFromRecurrence(
        @Ctx() context: GraphQLContext,
        @Arg('rrule') rrule: string
    ): Promise<string> {
        const rruleFromString = convertRRuleFromString(rrule);
        return convertRRuleToHumanReadable(rruleFromString);
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => FundTransaction)
    async editSingularGrant(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => EditGrantRecommendationInput) input: EditGrantRecommendationInput,
        @Arg('transactionId') transactionId: string
    ): Promise<FundTransaction> {
        // Variables
        const manager = context.typeorm.manager;

        // fetch user and profile data
        const [{ profile: userProfile }, fund] = await Promise.all([
            this.getPotentiallyImpersonatedProfile(context),
            manager.findOne(Fund, {
                where: { id: input.fundId },
                relations: ['userProfiles']
            })
        ]);

        // Check to make sure user exists on this fund
        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        if (
            !userIsAuthorized &&
            fund.userProfiles.find(profile => profile.id === userProfile.id) === undefined
        ) {
            throw new NotPermittedError('You are not permitted to perform this action');
        }

        // fetch transactions and statuses
        const [
            transaction,
            transactionInfo,
            submittedStatus,
            dueDillStatus,
            pendingStatus
        ] = await Promise.all([
            manager.findOne(FundTransaction, {
                where: { id: transactionId },
                relations: ['transactionStatus']
            }),
            manager.findOne(FundTransactionInfo, {
                fundTransactionId: transactionId
            }),
            manager.findOne(TransactionStatus, {
                name: TransactionStatusValue.SUBMITTED
            }),
            manager.findOne(TransactionStatus, {
                name: TransactionStatusValue.IN_DUE_DILIGENCE
            }),
            manager.findOne(TransactionDetailStatus, {
                name: TransactionDetailStatusValue.PENDING
            })
        ]);

        let newStatus = transaction.transactionStatus;
        switch (transaction.transactionStatus.name) {
            case TransactionStatusValue.SUBMITTED:
                newStatus = submittedStatus;
                break;
            case TransactionStatusValue.IN_DUE_DILIGENCE:
            case TransactionStatusValue.IN_REVIEW:
                newStatus = dueDillStatus;
                break;
        }

        const newMeta = { ...transaction.metadata };

        // Create proposed details again based on their current proposed details since they may have edited the amount
        // editing the proposed details happens in a separate call
        if (input.amount) {
            try {
                const proposedDetails = await createProposedDetails(
                    manager,
                    transactionId,
                    null,
                    input.amount
                );

                newMeta.proposedDetails = proposedDetails;
            } catch (error) {
                console.error(
                    `Unable to create detail metadata for grant ${transaction.transactionCode}: ${error}`
                );
            }
        }

        if (input.paymentType) {
            const paymentDetails = {
                ...(transaction.metadata?.paymentDetails ?? {}),
                paymentType: input.paymentType
            };
            newMeta.paymentDetails = paymentDetails;
        }

        // ensure grant amount is always negative
        const amount = Math.abs(input.amount || transaction.amount) * -1;

        const scheduledDate = input.payBy ? setToMidday(input.payBy) : undefined;
        
        // Get tenant
        const tenant = await manager.getRepository(Tenant).findOne();

        const fundTransactionSet: QueryDeepPartialEntity<FundTransaction> = Object.assign(
            {
                amount,
                transactionStatusId: newStatus.id,
                availableBalanceApproved: false,
                metadata: newMeta,
                specialApproval: input.amount > tenant.appSetting.specialApprovalThreshold || input.amount > 500000 ? false : null,
            },
            scheduledDate ? { scheduledDate } : {}
        );

        await manager
            .createQueryBuilder()
            .update(FundTransaction)
            .set(fundTransactionSet)
            .where('id = :id', { id: transactionId })
            .execute();

        await manager
            .createQueryBuilder()
            .update(FundTransactionDetail)
            .set({ transactionDetailStatusId: pendingStatus.id, amount })
            .where('fundTransaction = :id', { id: transactionId })
            .execute();

        const infoSet: QueryDeepPartialEntity<FundTransactionInfo> = Object.assign(
            {
                purposeNotesApproved: input.purposeNotes ? false : null,
                specialInstructionsApproved: input.specialInstructions ? false : null
            },
            scheduledDate ? { requestedProcessDate: scheduledDate } : {},
            // check for undefined values
            input.recipientId ? { recipientId: input.recipientId } : {},
            input.purposeCategory ? { purposeCategory: input.purposeCategory } : {},
            input.purposeNotes ? { purposeNotes: input.purposeNotes } : {},
            input.specialInstructions ? { specialInstructions: input.specialInstructions } : {},
            input.specialRecognition ? { specialRecognition: input.specialRecognition } : {},

            input.includeFundNameInRecognition
                ? { includeFundNameInRecognition: input.includeFundNameInRecognition }
                : {},
            input.includeDonorAddressInRecognition
                ? { includeDonorAddressInRecognition: input.includeDonorAddressInRecognition }
                : {},
            input.includeDonorNameInRecognition
                ? { includeDonorNameInRecognition: input.includeDonorNameInRecognition }
                : {}
        );

        await manager
            .createQueryBuilder()
            .update(FundTransactionInfo)
            .set(infoSet)
            .where('id = :id', { id: transactionInfo.id })
            .execute();

        return transaction;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => FundTransaction)
    async editGrantPaymentType(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => EditGrantRecommendationInput) input: EditGrantRecommendationInput,
        @Arg('transactionId') transactionId: string
    ): Promise<FundTransaction> {
        // Variables
        const manager = context.typeorm.manager;

        // Get Current User
        const { profile: userProfile } = await this.getPotentiallyImpersonatedProfile(context);

        const transaction = await manager.findOne(FundTransaction, {
            where: { id: transactionId },
            relations: ['transactionStatus']
        });

        const transactionInfo = await manager.findOne(FundTransactionInfo, {
            fundTransactionId: transaction.id
        });
        // Get Fund
        const fund = await manager.findOne(Fund, {
            where: { id: input.fundId },
            relations: ['userProfiles']
        });

        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        // Check to make sure user exists on this fund
        if (
            !userIsAuthorized &&
            fund.userProfiles.find(profile => profile.id === userProfile.id) === undefined
        ) {
            throw new NotPermittedError('You are not permitted to perform this action');
        }

        const newMeta = { ...transaction.metadata };

        if (input.paymentType) {
            const paymentDetails = {
                ...(transaction.metadata?.paymentDetails ?? {}),
                paymentType: input.paymentType
            };
            newMeta.paymentDetails = paymentDetails;
        }

        await manager
            .createQueryBuilder()
            .update(FundTransaction)
            .set({
                metadata: newMeta
            })
            .where('id = :id', {
                id: transactionId
            })
            .execute();

        return transaction;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => FundTransaction)
    async editRecurringGrant(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => CreateGrantRecommendationInput) input: CreateGrantRecommendationInput,
        @Arg('transactionId') transactionId: string,
        @Arg('recipientId') recipientId: string
    ): Promise<FundTransaction> {
        // Variables
        const manager = context.typeorm.manager;

        // Get Current User
        const { profile: userProfile } = await this.getPotentiallyImpersonatedProfile(context);
        const userProfileId = input.grantOnBehalfOfDonorUserProfileId
            ? input.grantOnBehalfOfDonorUserProfileId
            : userProfile.id;

        // Get Fund
        const fund = await manager.findOne(Fund, {
            where: { id: input.fundId },
            relations: ['userProfiles']
        });

        // Permission check
        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        if (
            !userIsAuthorized &&
            fund.userProfiles.find(profile => profile.id === userProfile.id) === undefined
        ) {
            throw new NotPermittedError('You are not permitted to perform this action');
        }

        // fetch data
        const [originalSeries, tenant, seriesType] = await Promise.all([
            manager.findOne(FundTransaction, {
                where: { id: transactionId },
                relations: ['transactionInfo']
            }),
            manager.getRepository(Tenant).findOne(),
            manager.findOne(TransactionType, {
                name: TransactionTypeValue.GRANT_SERIES
            })
        ]);

        // updated values
        const { scheduledDate, ...grantValues } = extractGrantPropertiesFromInput(
            input,
            recipientId,
            tenant
        );
        // if series has already started, don't unset these date
        const seriesScheduledDate = scheduledDate || originalSeries.scheduledDate;

        // reference original recurrence and info ids
        const oldRecurrenceId = originalSeries.transactionRecurrenceId;
        const oldInfoId = originalSeries.transactionInfo.id;

        // create new records
        const [recurrence] = await Promise.all([
            createRecurrenceRecord(
                manager,
                input,
                fund.id,
                recipientId,
                userProfileId,
                seriesType.id,
                originalSeries.id
            ),
            // series
            createInfoRecord(
                manager,
                input,
                originalSeries.id,
                recipientId,
                userProfileId,
                seriesScheduledDate
            )
        ]);

        /**
         * update properties on series
         * @see {createGrant} `graphql-api/src/utilities/createGrant.ts`
         */
        originalSeries.transactionRecurrenceId = recurrence.id;
        originalSeries.updatedBy = userProfileId;
        for (const key in grantValues) {
            originalSeries[key] = grantValues[key];
        }
        originalSeries.scheduledDate = seriesScheduledDate;

        await manager.save(originalSeries);

        // update recurrence FK on all instances
        await manager
            .createQueryBuilder()
            .update(FundTransaction)
            .set({ transactionRecurrenceId: recurrence.id, updatedBy: userProfileId })
            .where('originalFundTransactionId = :id', { id: transactionId })
            .execute();

        // delete the old records
        await Promise.all([
            manager
                .createQueryBuilder()
                .delete()
                .from(TransactionRecurrence)
                .where('id = :oldRecurrenceId', { oldRecurrenceId })
                .execute(),
            manager
                .createQueryBuilder()
                .delete()
                .from(FundTransactionInfo)
                .where('id = :oldInfoId', { oldInfoId })
                .execute()
        ]);

        // create event
        await manager.save(
            manager.create(TransactionEvent, {
                fundTransactionId: originalSeries.id,
                name: EventNameValue.EDITED,
                createdBy: userProfileId,
                updatedBy: userProfileId,
                userProfileId: userProfileId
            })
        );

        return originalSeries;
    }

    @Query(type => FundTransaction)
    async getTransactionFromTransactionCode(
        @Ctx() context: GraphQLContext,
        @Arg('transactionCode') transactionCode: string
    ): Promise<FundTransaction> {
        return await context.typeorm.manager.findOne(FundTransaction, {
            transactionCode
        });
    }

    @Query(type => Boolean)
    async checkForRecurrenceIdOnFundTransaction(
        @Ctx() context: GraphQLContext,
        @Arg('transactionCode') transactionCode: string
    ): Promise<boolean> {
        const transaction = await context.typeorm.manager.findOne(FundTransaction, {
            transactionCode
        });
        // response controls a redirect so if a 'transactionRecurrenceId' exists a redirect is not needed so it returns false
        return !!transaction.transactionRecurrenceId ? false : true;
    }

    @Mutation(type => TransactionPayment)
    async togglePaymentCompletion(
        @Ctx() context: GraphQLContext,
        @Arg('paymentId') paymentId: string,
        @Arg('bool') bool: boolean
    ): Promise<TransactionPayment> {
        const manager = context.typeorm.manager;

        const payment = await manager.findOne(TransactionPayment, {
            id: paymentId
        });

        payment.complete = bool;

        await manager.save(payment);

        return payment;
    }

    @Mutation(type => TransactionPayment)
    async regeneratePaymentFileDateAndCheckNumber(
        @Ctx() context: GraphQLContext,
        @Arg('transactionId') transactionId: string
    ): Promise<TransactionPayment> {
        const manager = context.typeorm.manager;
        const tenant = await manager.getRepository(Tenant).findOne();
        const profile = await this.getCurrentUserProfile(context);
        const glAccountRepo = context.typeorm.manager.getCustomRepository(GLAccountRepository);
        const glAccount = await glAccountRepo.getByType(GLAccountTypeName.GRANT_DISBURSEMENT);
        const grant = await manager.getRepository(FundTransaction).findOne({
            where: { id: transactionId },
            relations: [
                'transactionInfo',
                'transactionInfo.recipient',
                'transactionInfo.recipient.contact',
                'transactionInfo.recipient.contact.primaryAddress',
                'transactionDetails',
                'transactionDetails.transactionDetailType',
                'transactionDetails.transactionDetailStatus'
            ]
        });

        return await createSingleGrantPaymentDetail(manager, grant, profile, tenant, glAccount);
    }

    @Mutation(type => [FundTransaction])
    async cancelTransfer(
        @Ctx() context: GraphQLContext,
        @Arg('transferId') transferId: string
    ): Promise<FundTransaction[]> {
        const manager = context.typeorm.manager;
        const status = await manager.findOne(TransactionStatus, {
            name: TransactionStatusValue.CANCELED
        });
        const { profile: userProfile } = await this.getPotentiallyImpersonatedProfile(context);
        const transferTransaction = await manager
            .createQueryBuilder()
            .select('ft')
            .from(FundTransaction, 'ft')
            .where("metadata->'transferId' = :transferId", {
                transferId: JSON.stringify(transferId)
            })
            .getOne();

        const update = await manager
            .createQueryBuilder()
            .where("metadata->'transferId' = :transferId", {
                transferId: JSON.stringify(transferId)
            })
            .update(FundTransaction)
            .set({ enabled: false, transactionStatusId: status.id })
            .returning('*')
            .execute();

        await manager.save(
            manager.create(TransactionEvent, {
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                userProfileId: userProfile.id,
                fundTransactionId: transferTransaction.id,
                name: EventNameValue.CANCELED
            })
        );

        await manager.query(/* sql */ `
            UPDATE fund_transaction_detail
            SET transaction_detail_status_id =
            (SELECT id FROM transaction_detail_status WHERE transaction_detail_status.name = '${TransactionDetailStatusValue.CANCELED}')
			FROM fund_transaction WHERE fund_transaction.id = fund_transaction_detail.fund_transaction_id
            AND fund_transaction.metadata->>'transferId' = '${transferId}';
        `);

        return update.raw;
    }

    // @Mutation(type => [FundTransaction])
    // Process multiple transfers
    @Mutation(type => Boolean)
    async startTransfers(
        @Ctx() context: GraphQLContext,
        @Arg('omittedIds', type => [String]) omittedIds: string[]
    ): Promise<boolean> {
        const { manager } = context.typeorm;
        // Get Current User
        const { profile: userProfile } = await this.getPotentiallyImpersonatedProfile(context);

        const startedIds = await startTransfers(manager, omittedIds);

        for await (const transId of startedIds) {
            await manager.save(
                manager.create(TransactionEvent, {
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id,
                    userProfileId: userProfile.id,
                    fundTransactionId: transId,
                    name: EventNameValue.PROCESSED
                })
            );
        }

        return true;
    }

    @Query(type => FundsCheckResponse)
    @PermissionLock(PermissionAccessType.ADMIN_FUND_TRANSFERS, PermissionAccessLevel.READ)
    public async transfersUnableToBePaid(
        @Ctx() context: GraphQLContext,
        @Arg('omittedIds', type => [String], { nullable: false }) omittedIds: string[]
    ): Promise<FundsCheckResponse> {
        const query = await startableTransfersQuery(context.typeorm.manager, omittedIds);

        const transactions = await query.getMany();

        const fundRepo = context.typeorm.getCustomRepository(FundRepository);

        const fundsWithout = await fundsWithoutBalanceFromFundTransactions(transactions, fundRepo);

        if (fundsWithout.length > 0) {
            query.andWhere('fund.id IN (:...fundsWithout)', { fundsWithout });
            query.select('ft.id');
            query.addSelect('ft.amount');

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

    // process a single transfer
    @Mutation(type => Boolean)
    async startTransfer(
        @Ctx() context: GraphQLContext,
        @Arg('transId', type => String) transId: string
    ): Promise<boolean> {
        const { manager } = context.typeorm;
        // Get Current User
        const { profile: userProfile } = await this.getPotentiallyImpersonatedProfile(context);

        await startTransfer(manager, transId);

        await manager.save(
            manager.create(TransactionEvent, {
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                userProfileId: userProfile.id,
                fundTransactionId: transId,
                name: EventNameValue.PROCESSED
            })
        );

        return true;
    }

    @Mutation(type => FundTransaction)
    async updateFundTransfer(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => UpdateFundTransferInput) input: UpdateFundTransferInput,
        @Arg('transferId') transferId: string
    ): Promise<FundTransaction> {
        const manager = context.typeorm.manager;
        const { profile: userProfile } = await this.getPotentiallyImpersonatedProfile(context);
        // call utility to update the transfer transaction
        await manager.save(
            manager.create(TransactionEvent, {
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                userProfileId: userProfile.id,
                fundTransactionId: transferId,
                name: EventNameValue.EDITED
            })
        );
        return await updateTransfer(manager, transferId, input);
    }

    @Mutation(type => FundTransaction)
    async cancelTransaction(
        @Ctx() context: GraphQLContext,
        @Arg('transactionCode') transactionCode: string
    ): Promise<FundTransaction> {
        const manager = context.typeorm.manager;

        const { profile: userProfile } = await this.getPotentiallyImpersonatedProfile(context);
        // Get Fund transaction detail
        const transactionDetailRepo = manager.getRepository(FundTransactionDetail);
        const transactionRepo = manager.getRepository(FundTransaction);
        const recurrenceRepo = manager.getRepository(TransactionRecurrence);

        // get data
        const [transaction, canceledDetailStatus, cancelStatus] = await Promise.all([
            manager.findOne(FundTransaction, { transactionCode }),
            manager.findOne(TransactionDetailStatus, {
                name: TransactionDetailStatusValue.CANCELED
            }),
            manager.findOne(TransactionStatus, {
                name: TransactionStatusValue.CANCELED
            })
        ]);

        let futureTransaction: FundTransaction;

        // if series
        if (transaction.transactionRecurrenceId) {
            // get future transaction for series
            futureTransaction = await manager.findOne(FundTransaction, {
                where: { originalFundTransactionId: transaction.id },
                order: { scheduledDate: 'DESC' }
            });
            // disable recurrence record
            await recurrenceRepo
                .createQueryBuilder('recurrence')
                .update()
                .set({ enabled: false })
                .where({ id: transaction.transactionRecurrenceId })
                .execute();
        }

        const transactionIds: string[] = [transaction.id];
        if (futureTransaction) transactionIds.push(futureTransaction.id);

        // update detail statuses
        await manager
            .createQueryBuilder()
            .update(FundTransactionDetail)
            .set({ transactionDetailStatusId: canceledDetailStatus.id })
            .where('fundTransactionId IN (:...ids)', {
                ids: transactionIds
            })
            .execute();
        // update transaction statuses
        await manager
            .createQueryBuilder()
            .update(FundTransaction)
            .set({ transactionStatusId: cancelStatus.id })
            .where('id IN (:...ids)', {
                ids: transactionIds
            })
            .execute();

        // create event
        await manager.save(
            manager.create(TransactionEvent, {
                createdBy: userProfile.id,
                updatedBy: userProfile.id,
                userProfileId: userProfile.id,
                fundTransactionId: transaction.id,
                name: EventNameValue.CANCELED
            })
        );
        return transaction;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => FundTransaction)
    async editRecurringContribution(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => CreateFundContributionInput) input: CreateFundContributionInput,
        @Arg('transactionId') transactionId: string
    ): Promise<FundTransaction> {
        // Variables
        const manager = context.typeorm.manager;

        // Get Current User
        const { profile: userProfile } = await this.getPotentiallyImpersonatedProfile(context);
        const userProfileId = input.contributeOnBehalfOfDonorUserProfileId
            ? input.contributeOnBehalfOfDonorUserProfileId
            : userProfile.id;

        const transaction = await manager.findOne(FundTransaction, {
            id: transactionId
        });

        const userProfileAccount = await manager.findOne(UserProfileAccount, {
            id: input.userProfileAccountId
        });
        const userProfileAccountId = userProfileAccount.id;

        const recurrenceId = transaction.transactionRecurrenceId;
        // Get Fund
        const fund = await manager.findOne(Fund, {
            where: { id: input.fundId },
            relations: ['userProfiles']
        });

        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        // Check to make sure user exists on this fund
        if (
            !userIsAuthorized &&
            fund.userProfiles.find(profile => profile.id === userProfile.id) === undefined
        ) {
            throw new NotPermittedError('You are not permitted to perform this action');
        }

        const canceledStatus = await manager.findOne(TransactionStatus, {
            name: TransactionStatusValue.CANCELED
        });

        /**
         * for contribution series
         * sets recurrence id to null
         * the status id of the transaction to canceled
         * */
        await manager
            .createQueryBuilder()
            .update(FundTransaction)
            .set({
                transactionRecurrenceId: null,
                transactionStatusId: canceledStatus.id
            })
            .where('id = :id', { id: transactionId })
            .execute();

        // set recurrence id to null for each contribution instance
        await manager
            .createQueryBuilder()
            .update(FundTransaction)
            .set({ transactionRecurrenceId: null })
            .where('originalFundTransactionId = :ogId', { ogId: transactionId })
            .execute();

        // deletes recurrence record
        await manager
            .createQueryBuilder()
            .delete()
            .from(TransactionRecurrence)
            .where('id = :id', { id: recurrenceId })
            .execute();

        // create a new contribution series
        const transactionType = await manager.findOne(TransactionType, {
            name: TransactionTypeValue.CONTRIBUTION_SERIES
        });

        const newSeries = await createContribution(
            manager,
            userProfileId,
            userProfileAccountId,
            transactionType.id,
            input,
            { context }
        );

        // correct original fund transaction id and recurrence id for series
        await manager
            .createQueryBuilder()
            .update(FundTransaction)
            .set({
                originalFundTransactionId: newSeries.id,
                transactionRecurrenceId: newSeries.transactionRecurrenceId
            })
            .where('originalFundTransactionId = :id', { id: transactionId })
            .execute();

        return newSeries;
    }

    @Mutation(type => FundTransaction)
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.READ)
    public async createFundTransfer(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => CreateFundTransferInput) input: CreateFundTransferInput
    ): Promise<FundTransaction> {
        let resultTransaction: FundTransaction;
        const userProfile = await this.getCurrentUserProfile(context);
        // get id of user who initiated transfer
        const { id: userProfileId } = userProfile;

        await context.joinTransaction('createFundTransfer', async (manager, tranContext) => {
            let transferId: string;

            // If it is a transfer out generate the ID
            if (input.type === TransferType.TRANSFER_OUT) {
                const [{ id: generatedTransferId }] = await manager.query(/*sql*/ `
                SELECT uuid_generate_v4() AS id
            `);
                transferId = generatedTransferId;
                // Else if it is a transfer in
            } else if (input.type === TransferType.TRANSFER_IN && !!input.transferId) {
                transferId = input.transferId;
            } else {
                throw new Error('transferId missing from mutation or wrong transfer type');
            }

            resultTransaction = await createTransfer(context, userProfileId, transferId, input);
        })
        
        return resultTransaction;
    }

    @Query(type => FundTransactionResults)
    public async getFundTransfers(
        @Ctx() context: GraphQLContext,
        @Arg('fundIds', type => [String], { nullable: true }) fundIds?: string[],
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<FundTransactionResults> {
        const repo = context.typeorm.getRepository(FundTransaction);

        const fundWhere = !!fundIds && {
            fund: {
                id: { in: [...fundIds] }
            }
        };

        const searchIsAmount = stringIsCurrency(search || '');
        const isCode = isTCode(search || '');

        const searchTerm = searchIsAmount || isCode ? null : search;

        const conditions = {
            ...where,
            ...fundWhere,
            enabled: true,
            transactionType: {
                name: {
                    in: [TransactionTypeValue.TRANSFER_OUT, TransactionTypeValue.TRANSFER_IN]
                }
            }
        };

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, searchTerm);

        // query to get total results count
        const countQuery = this.createQuery(repo, conditions, null, null, null, searchTerm, false);
        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

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

        const countResult = await countQuery.getMany();

        return {
            timestamp,
            data: await dataQuery.getMany(),
            count: countResult.length,
            totalAmount: countResult.reduce((sum, t) => sum + Math.abs(t.amount), 0)
        };
    }

    @Query(type => FundTransactionResults)
    @PermissionLock(PermissionAccessType.ADMIN_FUND_TRANSFERS, PermissionAccessLevel.READ)
    public async adminFundTransfers(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTransactionFilter, { nullable: true })
        where?: FundTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<FundTransactionResults> {
        const repo = context.typeorm.getRepository(FundTransaction);

        const conditions = {
            ...where,
            transactionType: {
                name: {
                    in: [TransactionTypeValue.TRANSFER_OUT, TransactionTypeValue.TRANSFER_IN]
                }
            }
        };

        const countConditions = {
            transactionStatus: where?.transactionStatus ? where.transactionStatus : null,
            transactionType: {
                name: {
                    in: [TransactionTypeValue.TRANSFER_OUT, TransactionTypeValue.TRANSFER_IN]
                }
            }
        };

        const searchIsAmount = stringIsCurrency(search || '');
        const isCode = isTCode(search || '');

        const searchTerm = searchIsAmount || isCode ? null : search;

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, searchTerm);

        // query to get total results count
        const countQuery = this.createQuery(repo, conditions, null, null, null, searchTerm, false);
        const totalCountQuery = this.createQuery(repo, countConditions, null, null, null, null);
        const selectableCountQuery = this.createQuery(
            repo,
            conditions,
            null,
            null,
            null,
            searchTerm
        );

        selectableCountQuery.andWhere(
            'metadata::JSONB  #> \'{"transactionDestination","fundDetails","fundId" }\' != \'null\' '
        );

        selectableCountQuery.andWhere('entity.onHold = FALSE');

        if (searchTerm === null) {
            [dataQuery, countQuery, selectableCountQuery].forEach(query => {
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

        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        const countResult = await countQuery.getMany();
        const totalCountResult = await totalCountQuery.getCount();
        const selectableCountResult = await selectableCountQuery.getMany();

        return {
            timestamp,
            data: await dataQuery.getMany(),
            count: countResult.length,
            totalCount: totalCountResult,
            selectableCount: selectableCountResult.length,
            totalAmount: countResult.reduce((sum, t) => sum + Math.abs(t.amount), 0),
            selectableAmount: selectableCountResult.reduce((sum, t) => sum + Math.abs(t.amount), 0)
        };
    }

    @Query(type => FundTransaction)
    async fundTransactionById(
        @Ctx() context: GraphQLContext,
        @Arg('fundTransactionId') fundTransactionId: string
    ) {
        const { manager } = context.typeorm;
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const transaction = await manager.getRepository(FundTransaction).findOne(fundTransactionId);

        const userFund = await manager
            .createQueryBuilder(Fund, 'fund')
            .leftJoin('fund.fundUserProfiles', 'fundUserProfile')
            .where('fund.id = :fundId', { fundId: transaction.fundId })
            .andWhere('fundUserProfile.userProfileId = :profileId', { profileId: profile.id })
            .getOne();

        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUND_TRANSFERS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        if (userFund !== undefined || userIsAuthorized) {
            return transaction;
        } else {
            throw new NotPermittedError("You don't have sufficient privileges");
        }
    }

    @Query(type => [FundTransaction])
    async transferByTransferId(
        @Ctx() context: GraphQLContext,
        @Arg('transferId') transferId: string
    ) {
        const { manager } = context.typeorm;
        const transaction = await manager
            .createQueryBuilder()
            .select('ft')
            .from(FundTransaction, 'ft')
            .leftJoinAndSelect('ft.transactionType', 'fttt')
            .where(`ft.metadata::JSONB  @> '{ "transferId":"${transferId}" }'`)
            .getMany();

        return transaction;
    }

    @Query(type => FundTransactionDetail)
    // @PermissionLock(PermissionAccessType.ADMIN_BATCHES, PermissionAccessLevel.FULL)
    public async getFundTransactionDetailsFromId(
        @Ctx() context: GraphQLContext,
        @Arg('transactionId', type => String) transactionId: string
    ): Promise<FundTransactionDetail> {
        const ftd = await context.typeorm.manager.findOne(
            FundTransactionDetail,
            {
                id: transactionId
            },
            {
                relations: [
                    'fundTransaction',
                    'fundTransaction.transactionType',
                    'fundTransaction.fund',
                    'fundTransaction.fund.fundType'
                ]
            }
        );

        return ftd;
    }

    @Query(type => FundTransactionDetailResults)
    // @PermissionLock(PermissionAccessType.ADMIN_BATCHES, PermissionAccessLevel.FULL)
    public async getFundTransactionDetails(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionDetailOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => TransactionDetailFilter, { nullable: true })
        where?: TransactionDetailFilter,
        @Arg('search', type => String, { nullable: true }) search?: string,
        @Arg('sourceId', type => String, { nullable: true }) sourceId?: string,
        @Arg('destinationId', type => String, { nullable: true }) destinationId?: string
    ): Promise<FundTransactionDetailResults> {
        const repo = context.typeorm.getRepository(FundTransactionDetail);

        const conditions = {
            ...where,
            transactionDetailType: {
                name: {
                    in: [
                        TransactionDetailTypeName.CASH_IN,
                        TransactionDetailTypeName.CASH_OUT,
                        TransactionDetailTypeName.FEE,
                        TransactionDetailTypeName.DIVIDEND,
                        TransactionDetailTypeName.INTEREST,
                        TransactionDetailTypeName.INVESTMENT,
                        TransactionDetailTypeName.DIVESTMENT,
                        TransactionDetailTypeName.TRANSFER,
                        TransactionDetailTypeName.PROCESSING_FEE,
                        TransactionDetailTypeName.ADVISOR_FEE,
                        TransactionDetailTypeName.BANK_FEE
                    ]
                }
            }
        };

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, search)
            .andWhere('entity.batchId is NULL')
            .leftJoinAndSelect('entity.fundTransaction', 'ft')
            .leftJoinAndSelect('ft.fund', 'f')
            .leftJoinAndSelect('entity.sourceAccount', 'sa')
            .leftJoinAndSelect('entity.destinationAccount', 'da');

        if (!!sourceId && !!sourceId.length) {
            dataQuery.andWhere('sa.id = :id', {
                id: sourceId
            });
        }
        if (!!destinationId && !!destinationId.length) {
            dataQuery.andWhere('da.id = :id', {
                id: destinationId
            });
        }

        // get data in bulk
        const [[{ current_timestamp: timestamp }], [data, count]] = await Promise.all([
            context.typeorm.query('SELECT CURRENT_TIMESTAMP'),
            dataQuery.getManyAndCount()
        ]);

        return {
            timestamp,
            data,
            count
        };
    }

    private getInvestmentsDivestmentsWhere(where?: TransactionDetailFilter) {
        return {
            transactionDetailType: {
                name: {
                    in: [
                        TransactionDetailTypeName.DIVESTMENT,
                        TransactionDetailTypeName.INVESTMENT,
                        TransactionDetailTypeName.TRANSFER
                    ]
                }
            },
            ...where
        };
    }

    private applyTransactionDetailFilters(queries, filters: TransactionDetailCustomFilter) {
        if (filters.destination && filters.destination.length) {
            queries.forEach(query => {
                query.andWhere('entity.destinationAccount.id in (:...destinationIds)', {
                    destinationIds: filters.destination
                });
            });
        }

        if (filters.source && filters.source.length) {
            queries.forEach(query => {
                query.andWhere('entity.sourceAccount.id in (:...sourceIds)', {
                    sourceIds: filters.source
                });
            });
        }

        if (filters.type && filters.type.length) {
            queries.forEach(query => {
                query.andWhere('transactionDetailType.name in (:...typeIds)', {
                    typeIds: filters.type
                });
            });
        }

        if (filters.fund && filters.fund.length) {
            queries.forEach(query => {
                query.andWhere('fund.id in (:...fundIds)', { fundIds: filters.fund });
            });
        }

        if (filters.donor && filters.donor.length) {
            queries.forEach(query => {
                query.andWhere('createdByUserProfile.id in (:...donorIds)', {
                    donorIds: filters.donor
                });
            });
        }
    }

    /** query for tab data */
    @Query(type => FundTransactionDetailSummaryResults)
    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    public async adminInvestmentsDivestmentsFilterValuesSummary(
        @Ctx() context: GraphQLContext,
        @Arg('where', type => TransactionDetailFilter, { nullable: true })
        where?: TransactionDetailFilter
    ): Promise<FundTransactionDetailSummaryResults> {
        const repo = context.typeorm.getRepository(FundTransactionDetail);
        const conditions = {
            ...this.getInvestmentsDivestmentsWhere(where)
        };

        const summaryQuery = this.createQuery(repo, conditions)
            .select('SUM(ABS(entity.amount))', 'totalAmount')
            .addSelect('COUNT(entity.id)', 'totalCount')
            .andWhere('entity.sourceAccountId IS NOT NULL')
            .andWhere('entity.destinationAccountId IS NOT NULL');

        const idQuery = this.createQuery(repo, conditions)
            .select('entity.id', 'id')
            .andWhere('entity.sourceAccountId IS NOT NULL')
            .andWhere('entity.destinationAccountId IS NOT NULL');

        const [[{ current_timestamp: timestamp }], summaryResults, idResults] = await Promise.all([
            context.typeorm.query('SELECT CURRENT_TIMESTAMP'),
            summaryQuery.getRawOne(),
            idQuery.getRawMany()
        ]);

        return {
            timestamp,
            count: summaryResults.totalCount,
            amount: summaryResults.totalAmount,
            ids: idResults.map(r => r.id)
        };
    }

    @Query(type => FundTransactionDetailResults)
    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    public async adminInvestmentsDivestments(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionDetailOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('filters', type => TransactionDetailCustomFilter, { nullable: true })
        filters?: TransactionDetailCustomFilter,
        @Arg('where', type => TransactionDetailFilter, { nullable: true })
        where?: TransactionDetailFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<FundTransactionDetailResults> {
        const repo = context.typeorm.getRepository(FundTransactionDetail);

        const conditions = {
            ...this.getInvestmentsDivestmentsWhere(where)
        };

        const isAmount = stringIsCurrency(search || '');

        const searchTerm = isAmount ? null : search;
        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions, orderBy, skip, take, search);
        const totalFilteredQuery = this.createQuery(repo, conditions, null, null, null, search);

        // query to get total results count
        const countQuery = this.createQuery(repo, conditions, null, null, null, search, false);
        const totalCountQuery = this.createQuery(repo, this.getInvestmentsDivestmentsWhere(where));
        const totalFilteredOutQuery = this.createQuery(
            repo,
            this.getInvestmentsDivestmentsWhere(where)
        );

        if (isAmount) {
            [dataQuery, countQuery].forEach(query => {
                query.andWhere('ABS(entity.amount) = CAST(:searchAmount AS DOUBLE PRECISION)', {
                    searchAmount: numberFromCurrencyString(search)
                });
            });
        }

        dataQuery.leftJoinAndSelect('entity.batch', 'batch');

        // add joins
        [dataQuery, countQuery, totalFilteredQuery, totalFilteredOutQuery].forEach(query => {
            query
                .innerJoin('entity.fundInvestment', 'fundInvestment')
                .innerJoin('fundInvestment.investment', 'investment')
                .innerJoin('fundInvestment.fund', 'fund')
                .innerJoin('investment.institutionAccount', 'institutionAccount')
                .innerJoin('entity.sourceAccount', 'sourceAccount')
                .innerJoin('entity.destinationAccount', 'destinationAccount')
                .innerJoin('fund.createdByUserProfile', 'createdByUserProfile');
        });

        if (filters) {
            this.applyTransactionDetailFilters([dataQuery, countQuery, totalFilteredQuery], filters);
        }

        countQuery.select('COUNT(entity.id)', 'count');
        totalCountQuery
            .select('COUNT(entity.id)', 'totalCount')
            .addSelect('SUM(ABS(entity.amount))', 'totalAmount')
            .andWhere('entity.sourceAccountId IS NOT NULL')
            .andWhere('entity.destinationAccountId IS NOT NULL');
        totalFilteredQuery.select('entity.id', 'id');

        const [
            [{ current_timestamp: timestamp }],
            countResult,
            totalCountResult,
            totalFilteredResult,
            data
        ] = await Promise.all([
            context.typeorm.query('SELECT CURRENT_TIMESTAMP'),
            countQuery.getRawOne(),
            totalCountQuery.getRawOne(),
            totalFilteredQuery.getRawMany(),
            dataQuery.getMany()
        ]);

        countQuery.andWhere('entity.onHold = TRUE');
        const unselectableResult = await countQuery.andWhere('entity.onHold = TRUE').getMany();

        const { ids: unselectableIds, amount: unselectableAmount } = unselectableResult.reduce(
            (accum, transaction) => {
                accum.ids.push(transaction.id);
                accum.amount = currency.add(accum.amount, Math.abs(transaction.amount));

                return accum;
            },
            { ids: [] as string[], amount: 0 }
        );

        const filteredIds = totalFilteredResult.map(t => t.id);
        const filteredOutTransactionAmount = await totalFilteredOutQuery
            .select('SUM(ABS(entity.amount))', 'amount')
            .andWhere('entity.id NOT IN (:...filteredIds)', { filteredIds: filteredIds })
            .getRawOne();
        const filteredOutTransactionIds = await totalFilteredOutQuery
            .select('entity.id', 'id')
            .andWhere('entity.id NOT IN (:...filteredIds)', { filteredIds: filteredIds })
            .getRawMany();

        return {
            timestamp,
            data,
            count: countResult.count,
            totalCount: totalCountResult.totalCount,
            filteredOutIds: filteredOutTransactionIds.map(t => t.id),
            filteredOutAmount: filteredOutTransactionAmount.amount ?? 0,
            unselectableAmount,
            unselectableIds,
            totalAmount: totalCountResult.totalAmount ?? 0
        };
    }

    private fillSelectForFilter(
        dataQuery: SelectQueryBuilder<FundTransactionDetail>,
        filter: MoneyMovementTypes
    ) {
        let textField = 'transactionDetailType.name';
        let valueField = 'transactionDetailType.name';
        if (filter === MoneyMovementTypes.FUND) {
            dataQuery.innerJoin('entity.fundInvestment', 'fundInvestment');
            dataQuery.innerJoin('fundInvestment.fund', 'fund');

            textField = 'fund.name';
            valueField = 'fund.id';
        }
        if (filter === MoneyMovementTypes.SOURCE) {
            dataQuery.innerJoin('entity.sourceAccount', 'sourceAccount');
            textField = 'sourceAccount.title';
            valueField = 'sourceAccount.id';
        }
        if (filter === MoneyMovementTypes.DESTINATION) {
            dataQuery.innerJoin('entity.destinationAccount', 'destinationAccount');
            textField = 'destinationAccount.title';
            valueField = 'destinationAccount.id';
        }

        if (filter === MoneyMovementTypes.DONOR) {
            dataQuery.innerJoin('entity.fundInvestment', 'fundInvestment');
            dataQuery.innerJoin('fundInvestment.fund', 'fund');
            dataQuery.innerJoin('fund.createdByUserProfile', 'createdByUserProfile');

            const fullName =
                "CONCAT(createdByUserProfile.firstName, ' ', createdByUserProfile.lastName)";
            textField = fullName;
            valueField = 'createdByUserProfile.id';
        }

        dataQuery.distinct(true);
        dataQuery.select(`${textField} as "text"`);
        dataQuery.addSelect(`${valueField} as "value"`);
    }

    @Query(type => FilterTypeResults)
    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    public adminInvestmentsDivestmentsFilterTypes(
        @Ctx() context: GraphQLContext
    ): FilterTypeResults {
        return { types: Object.values(MoneyMovementTypes) };
    }

    @Query(type => FilterValueResults)
    @PermissionLock(PermissionAccessType.ADMIN_INVESTMENTS, PermissionAccessLevel.READ)
    public async adminInvestmentsDivestmentsFilterValues(
        @Ctx() context: GraphQLContext,
        @Arg('filter', type => MoneyMovementTypes, { nullable: false })
        filter: MoneyMovementTypes,
        @Arg('where', type => TransactionDetailFilter, { nullable: true })
        where?: TransactionDetailFilter
    ): Promise<FilterValueResults> {
        const repo = context.typeorm.getRepository(FundTransactionDetail);

        const conditions = this.getInvestmentsDivestmentsWhere(where);

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions);
        this.fillSelectForFilter(dataQuery, filter);

        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        const data = (await dataQuery.getRawMany()) as FilterValue[];
        if (filter === MoneyMovementTypes.TYPE) {
            data.forEach(item => (item.text = capitalizationFormatter(item.text)));
        }

        return {
            timestamp,
            data: data
        };
    }

    private fillSelectForGrantFilter(
        dataQuery: SelectQueryBuilder<FundTransaction>,
        filter: GrantFilterTypes
    ) {
        let textField = '';
        let valueField = '';

        if (filter === GrantFilterTypes.FUND) {
            dataQuery.innerJoin('entity.fund', 'fund');
            textField = 'fund.name';
            valueField = 'fund.id';
        }
        else if (filter === GrantFilterTypes.RECIPIENT) {
            dataQuery.innerJoin('entity.transactionInfo', 'transactionInfo');
            dataQuery.innerJoin('transactionInfo.recipient', 'recipient');
            textField = 'recipient.name';
            valueField = 'recipient.id';
        }
        else if (filter === GrantFilterTypes.STATUS) {
            dataQuery.innerJoin('entity.transactionStatus', 'transactionStatus');
            textField = 'transactionStatus.name';
            valueField = 'transactionStatus.id';
        }

        dataQuery.distinct(true);
        dataQuery.select(`${textField} as "text"`);
        dataQuery.addSelect(`${valueField} as "value"`);
    }
    
    @Query(type => FilterTypeResults)
    @PermissionLock(PermissionAccessType.ADMIN_GRANTS, PermissionAccessLevel.READ)
    public adminGrantManagementFilterTypes(
        @Ctx() context: GraphQLContext
    ): FilterTypeResults {
        return { types: Object.values(GrantFilterTypes) };
    }

    @Query(type => FilterValueResults)
    @PermissionLock(PermissionAccessType.ADMIN_GRANTS, PermissionAccessLevel.READ)
    public async adminGrantManagementFilterValues(
        @Ctx() context: GraphQLContext,
        @Arg('filter', type => GrantFilterTypes, { nullable: false })
        filter: GrantFilterTypes
    ): Promise<FilterValueResults> {

        let data:FilterValue[]
        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        if(filter === GrantFilterTypes.HOLD) {
            // Seems wasteful to pull a boolean option from the database, but maybe not?
            data = [
                { text: 'On  Hold', value: '1' },
                { text: 'Not On Hold', value: '0' }
            ] 
        }
        else {
            const repo = context.typeorm.getRepository(FundTransaction);
            const conditions =  { transactionType: {
                name: TransactionTypeValue.GRANT
            } }

            // query to get paginated results
            const dataQuery = this.createQuery(repo, conditions);
            this.fillSelectForGrantFilter(dataQuery, filter);

            dataQuery.orderBy('text');

            data = (await dataQuery.getRawMany()) as FilterValue[];

            if (filter === GrantFilterTypes.STATUS) {
                data.forEach(item => (item.text = startCase(camelCase(item.text))));
            }
        }

        return {
            timestamp,
            data: data
        };
    }

    private fillSelectForContributionsFilter(
        dataQuery: SelectQueryBuilder<FundTransaction>,
        filter: ContributionsFilterTypes
    ) {
        let textField = '';
        let valueField = '';

        if (filter === ContributionsFilterTypes.FUND) {
            dataQuery.innerJoin('entity.fund', 'fund');
            textField = 'fund.name';
            valueField = 'fund.id';
        }
        else if (filter === ContributionsFilterTypes.STATUS) {
            dataQuery.innerJoin('entity.transactionStatus', 'transactionStatus');
            textField = 'transactionStatus.name';
            valueField = 'transactionStatus.id';
        }
        else if (filter === ContributionsFilterTypes.TYPE) {
            textField = 'entity.metadata->\'paymentDetails\'->>\'paymentType\'';
            valueField = 'entity.metadata->\'paymentDetails\'->>\'paymentType\'';
            dataQuery.andWhere('entity.metadata->\'paymentDetails\'->>\'paymentType\' is not null')
        }

        dataQuery.distinct(true);
        dataQuery.select(`${textField} as "text"`);
        dataQuery.addSelect(`${valueField} as "value"`);
    }

    @Query(type => FilterTypeResults)
    @PermissionLock(PermissionAccessType.ADMIN_CONTRIBUTIONS, PermissionAccessLevel.READ)
    public adminContributionsFilterTypes(
        @Ctx() context: GraphQLContext
    ): FilterTypeResults {
        return { types: Object.values(ContributionsFilterTypes) };
    }

    @Query(type => FilterValueResults)
    @PermissionLock(PermissionAccessType.ADMIN_CONTRIBUTIONS, PermissionAccessLevel.READ)
    public async adminContributionsFilterValues(
        @Ctx() context: GraphQLContext,
        @Arg('filter', type => ContributionsFilterTypes, { nullable: false })
        filter: ContributionsFilterTypes
    ): Promise<FilterValueResults> {

        // query to get current timestamp
        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        const repo = context.typeorm.getRepository(FundTransaction);
        const conditions =  { transactionType: {
            name: TransactionTypeValue.CONTRIBUTION
        } }

        // query to get paginated results
        const dataQuery = this.createQuery(repo, conditions);
        let data:FilterValue[] = [];

        if (filter === ContributionsFilterTypes.DONOR) {
            dataQuery.innerJoinAndSelect('entity.userProfile', 'donor')
            dataQuery.select('donor.id, donor.first_name as "firstName", donor.middle_name as "middleName", donor.last_name as "lastName"')
            dataQuery.distinct(true)
            dataQuery.orderBy('donor.last_name,donor.middle_name,donor.first_name')

            console.log(dataQuery.getSql())
            const results = context.typeorm.getRepository(UserProfile).create(await dataQuery.getRawMany())

            data = results.map(p => { p.setFullName(); return { text: p.fullName, value: p.id } })
        }
        else {
            this.fillSelectForContributionsFilter(dataQuery, filter);

            dataQuery.orderBy('text')
            console.log(dataQuery.getSql())
            data = (await dataQuery.getRawMany()) as FilterValue[];
        }

        if (filter === ContributionsFilterTypes.STATUS) {
            data.forEach(item => (item.text = startCase(camelCase(item.text))));
        }

        return {
            timestamp,
            data: data
        };
    }

    @Mutation(type => [ProposedDetailsMeta])
    async updateProposedDetails(
        @Ctx() context: GraphQLContext,
        @Arg('id') id: string,
        @Arg('allocationInstructions', type => [InvestmentInput])
        allocationInstructions: InvestmentInput[]
    ): Promise<ProposedDetailsMeta[]> {
        if (sumBy(allocationInstructions, d => d.percentage * 100) / 100 !== 1) {
            throw Error('The sum of divestment percentages must be equal to one.');
        }
        const fundTransaction = await context.typeorm.getRepository(FundTransaction).findOne(id);
        const metadata = fundTransaction.metadata ?? {};
        const proposedDetails = await createProposedDetails(
            context.typeorm.manager,
            id,
            allocationInstructions
        );
        metadata['proposedDetails'] = proposedDetails;

        // update metadata (don't await)
        context.typeorm
            .createQueryBuilder()
            .update(FundTransaction)
            .set({ metadata })
            .where('id = :id', { id })
            .execute();
        return Promise.resolve(proposedDetails);
    }

    @Mutation(type => [String])
    async takeTransactionsOffHold(
        @Ctx() context: GraphQLContext,
        @Arg('transactionIds', type => [String]) transactionIds: string[]
    ): Promise<string[]> {
        const transactionRepo = context.typeorm.getRepository(FundTransaction);

        await transactionRepo
            .createQueryBuilder('entity')
            .update()
            .set({ onHold: false })
            .where('id IN (:...transactionIds)', { transactionIds })
            .returning(['id'])
            .execute();

        return transactionIds;
    }
}
