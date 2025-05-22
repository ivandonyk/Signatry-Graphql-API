import { Arg, Ctx, Int, Query, registerEnumType } from 'type-graphql';
import { EntityManager } from 'typeorm';
import { GraphQLContext } from '../context';
import NotPermittedError from '../errors/NotPermitted';
import { FundTransactionOrderBy } from '../inputs/FundTransaction/FundTransactionOrderBy';
import { FundTransaction, FundTransactionResults } from '../models';
import { Fund } from '../models/Fund';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { RecurringGrantsCounts } from '../models/RecurringGrantsCounts';
import { TransactionRecurrence } from '../models/TransactionRecurrence';
import { TransactionType, TransactionTypeValue } from '../models/TransactionType';
import { BaseResolver } from './core/BaseResolver';
import { filterRecurrencesByStatus } from './filterRecurrencesByStatus';
import { currency } from '../utilities/currency';

export enum RecurrenceStatuses {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
    ALL = 'ALL'
}

registerEnumType(RecurrenceStatuses, {
    name: 'RecurrenceStatuses',
    description:
        'The recurrence status is ACTIVE if the rrule has outstanding recurrences at the time of the request.'
});

registerEnumType(TransactionTypeValue, {
    name: 'TransactionTypeValue',
    description: 'Grant Or Contribution'
});

export class TransactionRecurrenceResolver extends BaseResolver {
    @Query(type => RecurringGrantsCounts)
    public async getGrantTransactionRecurrencesForFundCount(
        @Ctx() context: GraphQLContext,
        @Arg('recurrenceType', () => TransactionTypeValue)
        recurrenceType: TransactionTypeValue,
        @Arg('fundCode', type => String, {
            nullable: true,
            description:
                'If not provided, gets all recurrence records associated with the currently logged in UserProfile'
        })
        fundCode?: string
    ): Promise<RecurringGrantsCounts> {
        const { manager } = context.typeorm;
        const all = await this.getRecurrences(
            manager,
            context,
            RecurrenceStatuses.ALL,
            recurrenceType,
            fundCode
        );
        const expired = filterRecurrencesByStatus(all, RecurrenceStatuses.EXPIRED).length;
        const active = filterRecurrencesByStatus(all, RecurrenceStatuses.ACTIVE).length;

        return {
            all: all.length,
            expired,
            active
        };
    }

    @Query(type => [TransactionRecurrence], {
        description:
            'Gets all TransactionRecurrences with the TransactionTypeValue of GRANT. If no fundCode provided, gets all for currently logged in user'
    })
    public async getGrantTransactionRecurrencesForFund(
        @Ctx() context: GraphQLContext,
        @Arg('recurrenceStatus', () => RecurrenceStatuses) recurrenceStatus: RecurrenceStatuses,

        @Arg('recurrenceType', () => TransactionTypeValue)
        recurrenceType: TransactionTypeValue,
        @Arg('fundCode', type => String, {
            nullable: true,
            description:
                'If not provided, and userProfileId also not provided, gets all recurrence records associated with the currently logged in UserProfile'
        })
        fundCode?: string,
        @Arg('userProfileId', type => String, {
            nullable: true,
            description:
                'If provided, and fundCode not provided, get recurrence records associated with given UserProfile.id'
        })
        userProfileId?: string
    ): Promise<TransactionRecurrence[]> {
        const { manager } = context.typeorm;
        return await this.getRecurrences(
            manager,
            context,
            recurrenceStatus,
            recurrenceType,
            fundCode,
            userProfileId
        );
    }

    private async getRecurrences(
        manager: EntityManager,
        context: GraphQLContext,
        recurrenceStatus: RecurrenceStatuses,
        recurrenceType: TransactionTypeValue,
        fundCode?: string,
        userProfileId?: string
    ) {
        const requestingUserProfile = await this.getCurrentUserProfile(context);
        const requestingUserPermissions = await this.getPermissionList(context);
        let recurrences: TransactionRecurrence[];

        const transactionType = await manager.findOne(TransactionType, {
            name: recurrenceType
        });

        // If no fundCode specified, get all associated with the user
        if (!fundCode) {
            const baseQuery = manager
                .createQueryBuilder(TransactionRecurrence, 'recurrence')
                .leftJoin('recurrence.fund', 'fund')
                .leftJoin('fund.fundUserProfiles', 'fundUserProfile')
                .leftJoinAndSelect('recurrence.fundTransaction', 'fundTransaction')
                .leftJoin('recurrence.recipient', 'recipient')
                .leftJoin('recurrence.transactionType', 'transactionType')
                .leftJoinAndSelect('fundTransaction.transactionType', 'ftTransactionType')
                .where('ftTransactionType.id = :id', { id: transactionType.id });
            if (userProfileId) {
                baseQuery.andWhere('fundTransaction.createdBy = :userProfileId', {
                    userProfileId
                });
            } else {
                baseQuery.andWhere('fundUserProfile.userProfileId = :fundProfileId', {
                    fundProfileId: requestingUserProfile.id
                });
            }
            recurrences = await baseQuery.getMany();
        } else {
            // Otherwise, get the fund at the fundCode provided, and ensure it belongs to the currently logged in user or the requesting user is Staff/Admin
            const fund = await manager.findOne(Fund, {
                where: { fundCode },
                relations: ['fundUserProfiles']
            });

            if (!fund) throw new Error('Unable to find fund with specified fundCode');
            if (
                !requestingUserPermissions.some(
                    permission =>
                        permission.accessType === PermissionAccessType.ADMIN_INVESTMENTS &&
                        permission.accessLevel === PermissionAccessLevel.READ
                ) &&
                !fund.fundUserProfiles.some(
                    associatedUserProfile => associatedUserProfile.id !== requestingUserProfile.id
                )
            ) {
                throw new NotPermittedError('User not associated with fund');
            }

            recurrences = await manager
                .createQueryBuilder(TransactionRecurrence, 'recurrence')
                .leftJoin('recurrence.fund', 'fund')
                .leftJoin('fund.fundUserProfiles', 'fundUserProfile')
                .leftJoinAndSelect('recurrence.fundTransaction', 'fundTransaction')
                .leftJoinAndSelect('fundTransaction.transactionType', 'ftTransactionType')
                .leftJoin('recurrence.transactionType', 'transactionType')
                .leftJoin('fundTransaction.transactionStatus', 'transactionStatus')
                .where('ftTransactionType.id = :ftTypeId AND fund.id = :fundId', {
                    ftTypeId: transactionType.id,
                    fundId: fund.id
                })
                .getMany();
        }

        if (!recurrenceStatus) return recurrences;
        return filterRecurrencesByStatus(recurrences, recurrenceStatus);
    }

    @Query(type => FundTransactionResults)
    public async getFundTransactionRecurrenceSeries(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('transactionId', type => String)
        transactionId?: string
    ): Promise<FundTransactionResults> {
        const { manager } = context.typeorm;

        const transactionQuery = manager
            .createQueryBuilder(FundTransaction, 'ft')
            .select()
            .where('ft.id = :transactionId AND ft.originalFundTransactionId IS NOT NULL', {
                transactionId
            })
            .orWhere('ft.originalFundTransactionId = :originalTransactionId', {
                originalTransactionId: transactionId
            });

        if (orderBy) {
            const orderKey = Object.keys(orderBy)[0];
            const orderDirection = typeof orderBy[orderKey] === 'string' ? orderBy[orderKey] : null;
            transactionQuery.orderBy(orderKey, orderDirection);
        }

        if (take) {
            transactionQuery.take(take);
        }
        if (skip) {
            transactionQuery.skip(skip);
        }

        const transactions = await transactionQuery.getMany();

        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        const sum = transactions.reduce(
            (acc: number, transaction: FundTransaction) => currency.add(acc, transaction.amount),
            0
        );

        return {
            timestamp,
            data: transactions,
            count: transactions.length,
            totalAmount: sum || 0
        };
    }
}
