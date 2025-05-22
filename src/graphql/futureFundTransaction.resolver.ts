import { Resolver, Query, Ctx, Arg } from 'type-graphql';
import { SelectQueryBuilder, Brackets } from 'typeorm';
import dayjs, { OpUnitType, QUnitType } from 'dayjs';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { Fund } from '../models/Fund';
import { FundTransaction } from '../models/FundTransaction';
import { PermissionLock } from '../decorators/permissionDecorator';
import { TransactionType, TransactionTypeValue } from '../models/TransactionType';
import { rrulestr } from 'rrule';
import NotPermittedError from '../errors/NotPermitted';
import { FundTransactionOrderBy } from '../inputs/FundTransaction/FundTransactionOrderBy';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { FundRoleNameValues } from '../models/FundRole';
import _ from 'lodash';

@Resolver()
export class FutureFundTransactionResolver extends UtilityResolver {
    @Query(type => [FundTransaction])
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    public async getGrantsForFundToBePaidWithinTimeRange(
        @Ctx() context: GraphQLContext,
        @Arg('range', type => String) range: OpUnitType,
        @Arg('recurrenceType', () => TransactionTypeValue) recurrenceType: TransactionTypeValue,
        @Arg('fundCode', type => String, { nullable: true }) fundCode?: string,
        @Arg('userProfileId', type => String, { nullable: true }) userProfileId?: string,
        @Arg('orderBy', type => FundTransactionOrderBy, { nullable: true })
        orderBy?: FundTransactionOrderBy,
        @Arg('statusFilter', type => [String], { nullable: true }) statusFilter?: string[]
    ): Promise<FundTransaction[]> {
        const { manager } = context.typeorm;
        const { profile: userProfile } = await this.getPotentiallyImpersonatedProfile(context);
        const permissions = await this.getPermissionList(context);
        const fundRepo = manager.getRepository(Fund);
        const fundTransactionRepo = manager.getRepository(FundTransaction);

        const transactionType = await manager.findOne(TransactionType, {
            name: recurrenceType
        });

        const isAdmin = permissions.some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_GRANTS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        // Ensure the Fund with the passed fundCode belongs to the requesting UserProfile, or the requesting user is a Staff/Admin member
        if (fundCode) {
            const fund = await fundRepo.findOne(
                { fundCode: fundCode },
                { relations: ['fundUserProfiles'] }
            );
            if (
                !isAdmin &&
                !fund.fundUserProfiles.find(
                    fundUserProfile => fundUserProfile.userProfileId === userProfile.id
                )
            ) {
                throw new NotPermittedError('Fund does not belong to requesting user');
            }
        }

        let query: SelectQueryBuilder<FundTransaction>;
        const baseQuery = manager
            .createQueryBuilder(FundTransaction, 'fundTransaction')
            .leftJoin('fundTransaction.fund', 'fund')
            .leftJoin('fundTransaction.transactionType', 'transactionType')
            .leftJoin('fundTransaction.transactionStatus', 'transactionStatus')
            .leftJoin('fund.fundUserProfiles', 'fundUserProfile')
            .leftJoin('fundUserProfile.fundRole', 'fundRole')
            .leftJoinAndSelect(
                'fundTransaction.transactionRecurrence',
                'transactionRecurrence',
                'transactionRecurrence.enabled = true'
            )
            .where('transactionType.id = :typeId', { typeId: transactionType.id });

        if (!!statusFilter) {
            baseQuery.andWhere('transactionStatus.name NOT IN (:...statusFilter)', {
                statusFilter
            });
        }

        // If fundCode not provided, get all transactions for all funds associated with the requesting user or userProfileId argument, otherwise limit the query to the transactions on the passed fund
        if (!fundCode) {
            if (userProfileId) {
                if (!isAdmin) {
                    throw new NotPermittedError('Requesting user is not an admin');
                }
                query = baseQuery.andWhere('fundTransaction.createdBy = :userProfileId', {
                    userProfileId: userProfileId
                });
            } else {
                query = baseQuery
                    .andWhere('fundUserProfile.userProfileId = :userProfileId', {
                        userProfileId: userProfile.id
                    })
                    .andWhere('fundRole.name != :noAccess', {
                        noAccess: FundRoleNameValues.NO_ACCESS
                    });
            }
        } else {
            query = baseQuery.andWhere('fund.fundCode = :fundCode', {
                fundCode
            });
        }

        const relations = fundTransactionRepo.metadata.ownRelations;

        for (const propName in orderBy) {
            if (propName === 'scheduledDate') {
                continue;
            }
            const propValue = orderBy[propName];

            // Super simple order by requests
            if (typeof propValue !== 'object') {
                this.addBasicOrderBy(query, 'fundTransaction', propName, propValue);
                continue;
            }

            const relation = relations.find(relation => relation.propertyName === propName);

            if (relation) {
                this.addRelationOrderBy(
                    query,
                    'fundTransaction',
                    propName,
                    propValue,
                    relation,
                    manager
                );
                continue;
            }
        }

        const transactions = await query.getMany();

        // Since results are stubbed out, we need to manually sort scheduled dates, if requested
        if (orderBy?.scheduledDate) {
            const getDatesForSorting = (fts: FundTransaction[]) => {
                return fts.map(ft => {
                    let date = ft.scheduledDate;
                    // one-time transactions can fallback to createdOn
                    if (!date && !ft.transactionRecurrenceId) date = ft.createdOn;

                    return date;
                });
            };
            const val = orderBy.scheduledDate;
            transactions.sort((first, second) => {
                const [firstDate, secondDate] = getDatesForSorting([first, second]);
                // nothing to compare, move on
                if (!firstDate || !secondDate) return -1;

                if (val === 'ASC') return firstDate.getTime() - secondDate.getTime();
                return secondDate.getTime() - firstDate.getTime();
            });
        }

        // Because multiple transaction records could have been created with the same transactionRecurrence record,
        // we need to de-dupe by transaction.id
        return _.uniqBy(transactions, fundTransaction => fundTransaction.id);
    }

    @Query(type => [FundTransaction], {
        description:
            'Gets a list of transactions of transactionType.name GRANT where it is either a one-time grant that has scheduledDate, or it is a recurring grant.'
    })
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    public async getGrantsForFundToBePaidWithin90Days(
        @Ctx() context: GraphQLContext,
        @Arg('range', type => String) range: QUnitType,
        @Arg('recurrenceType', () => TransactionTypeValue)
        recurrenceType: TransactionTypeValue,
        @Arg('fundCode', type => String, { nullable: true }) fundCode?: string,
        @Arg('userProfileId', type => String, { nullable: true }) userProfileId?: string,
        @Arg('orderBy', type => FundTransactionOrderBy, { nullable: true })
        orderBy?: FundTransactionOrderBy
    ): Promise<FundTransaction[]> {
        const { manager } = context.typeorm;
        const userProfile = await this.getCurrentUserProfile(context);
        const permissions = await this.getPermissionList(context);
        const fundRepo = manager.getRepository(Fund);
        const fundTransactionRepo = manager.getRepository(FundTransaction);

        const transactionType = await manager.findOne(TransactionType, {
            name: recurrenceType
        });

        const isAdmin = permissions.some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_GRANTS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        // Ensure the Fund with the passed fundCode belongs to the requesting UserProfile, or the requesting user is a Staff/Admin member
        if (fundCode) {
            const fund = await fundRepo.findOne(
                { fundCode: fundCode },
                { relations: ['fundUserProfiles'] }
            );
            if (
                !isAdmin &&
                !fund.fundUserProfiles.find(
                    fundUserProfile => fundUserProfile.userProfileId === userProfile.id
                )
            ) {
                throw new NotPermittedError('Fund does not belong to requesting user');
            }
        }

        let query: SelectQueryBuilder<FundTransaction>;
        const baseQuery = manager
            .createQueryBuilder(FundTransaction, 'fundTransaction')
            .leftJoin('fundTransaction.fund', 'fund')
            .leftJoin('fundTransaction.transactionType', 'transactionType')
            .leftJoin('fund.fundUserProfiles', 'fundUserProfile')
            .leftJoin('fundUserProfile.fundRole', 'fundRole')
            .leftJoinAndSelect(
                'fundTransaction.transactionRecurrence',
                'transactionRecurrence',
                'transactionRecurrence.enabled = true'
            )
            .where('transactionType.id = :id', { id: transactionType.id })
            .andWhere(
                // Get One-time transactions with a future scheduledPayment date, or recurring transactions
                new Brackets(qb => {
                    qb.where('fundTransaction.transactionRecurrenceId IS NOT NULL').orWhere(
                        new Brackets(qb => {
                            qb.where('fundTransaction.transactionRecurrenceId IS NULL').andWhere(
                                'fundTransaction.scheduledDate IS NOT NULL'
                            );
                        })
                    );
                })
            );

        // If fundCode not provided, get all transactions for all funds associated with the requesting user or userProfileId argument, otherwise limit the query to the transactions on the passed fund
        if (!fundCode) {
            if (userProfileId) {
                if (!isAdmin) {
                    throw new NotPermittedError('Requesting user is not an admin');
                }
                query = baseQuery.andWhere('fundTransaction.createdBy = :userProfileId', {
                    userProfileId: userProfileId
                });
            } else {
                query = baseQuery
                    .andWhere('fundUserProfile.userProfileId = :userProfileId', {
                        userProfileId: userProfile.id
                    })
                    .andWhere('fundRole.name != :noAccess', {
                        noAccess: FundRoleNameValues.NO_ACCESS
                    });
            }
        } else {
            query = baseQuery.andWhere('fund.fundCode = :fundCode', {
                fundCode
            });
        }

        const relations = fundTransactionRepo.metadata.ownRelations;

        for (const propName in orderBy) {
            if (propName === 'scheduledDate') {
                continue;
            }
            const propValue = orderBy[propName];

            // Super simple order by requests
            if (typeof propValue !== 'object') {
                this.addBasicOrderBy(query, 'fundTransaction', propName, propValue);
                continue;
            }

            const relation = relations.find(relation => relation.propertyName === propName);

            if (relation) {
                this.addRelationOrderBy(
                    query,
                    'fundTransaction',
                    propName,
                    propValue,
                    relation,
                    manager
                );
                continue;
            }
        }

        const transactions = await query.getMany();

        const today = new Date();
        const rangeEndDay = dayjs()
            .add(1, range)
            .toDate();

        // Convert to UTC
        const rangeStart = new Date(
            Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
        );
        const rangeEnd = new Date(
            Date.UTC(rangeEndDay.getFullYear(), rangeEndDay.getMonth(), rangeEndDay.getDate())
        );

        const futureGrants: FundTransaction[] = [];

        // Because multiple transaction records could have been created with the same transactionRecurrence record, the accumulator deduplicates the transactions that have the same recurrence id
        transactions.reduce((acc, current) => {
            // Add the one-time grant
            if (!current.transactionRecurrenceId) {
                futureGrants.push(current);
                return acc;
            }

            // If the grant with this recurrenceId hasn't been processed yet, stub out fake transactions based on the recurrence rules
            if (!!current.transactionRecurrence && !acc[current.transactionRecurrenceId]) {
                const rule = rrulestr(current.transactionRecurrence.recurrenceRule);
                const recurrences = rule.between(new Date(rangeStart), new Date(rangeEnd));

                // Note: we're not actually saving the FundTransaction records created here--we're only stubbing out future transactions
                const transactionStubs = recurrences.map(recurrence => {
                    return fundTransactionRepo.create({
                        ...current,
                        scheduledDate: recurrence
                    });
                });

                futureGrants.push(...transactionStubs);

                // Record that we've seen this transactionRecurrenceId, and don't need to stub out transcactions for it anymore
                acc[current.transactionRecurrenceId] = true;
            }
            return acc;
        }, {});

        // Since results are stubbed out, we need to manually sort scheduled dates, if requested
        if (orderBy?.scheduledDate) {
            const val = orderBy.scheduledDate;
            if (val === 'ASC') {
                futureGrants.sort(
                    (first, second) =>
                        first.scheduledDate.getTime() - second.scheduledDate.getTime()
                );
            } else {
                futureGrants.sort(
                    (first, second) =>
                        second.scheduledDate.getTime() - first.scheduledDate.getTime()
                );
            }
        }

        return futureGrants;
    }
}
