import { Resolver, Query, Ctx, Arg, Int } from 'type-graphql';
import dayjs from 'dayjs';

// models
import { AllTransactionView } from '../models';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { AllTransactionOrderBy } from '../inputs/AllTransaction/AllTransactionOrderBy';
import { AllTransactionResults } from '../inputs/AllTransaction/AllTransactionResults';
import { AllTransactionFilter } from '../inputs/AllTransaction/AllTransactionFilter';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import {
    AllTransactionTypes,
    FilterTypeResults,
    FilterValueResults
} from '../models/FilterValueResults';
import { statusFormatter } from '../utilities/format';
import { SelectQueryBuilder } from 'typeorm';

@Resolver()
export class AllTransactionResolver extends UtilityResolver {
    private mapEnumValueToColumn(enumValue: AllTransactionTypes): string {
        switch (enumValue) {
            case AllTransactionTypes.TYPE:
                return 'transactionType';

            case AllTransactionTypes.STATUS:
                return 'transactionStatus';

            case AllTransactionTypes.FUND:
                return 'fundId';

            case AllTransactionTypes.SOURCE:
                return 'sourceAccountId';

            case AllTransactionTypes.DESTINATION:
                return 'destinationAccountId';
        }
    }

    private addWhereFilter(
        query: SelectQueryBuilder<AllTransactionView>,
        where: AllTransactionFilter
    ) {
        // filtering via buttons
        where.inputs.forEach(input => {
            if (input.value.length) {
                const columnName = this.mapEnumValueToColumn(input.type);

                query.andWhere(`${query.alias}.${columnName} IN (:...${columnName}Values)`, {
                    [columnName + 'Values']: input.value
                });
            }
        });

        // range limits
        const start = where.rangeLimits.start
            ? dayjs(where.rangeLimits.start)
                  .startOf('day')
                  .toDate()
            : null;
        const end = where.rangeLimits.end
            ? dayjs(where.rangeLimits.end)
                  .endOf('day')
                  .toDate()
            : null;

        if (start) query.andWhere(`${query.alias}.transactionDateTime >= :start`, { start });
        if (end) query.andWhere(`${query.alias}.transactionDateTime <= :end`, { end });

        return query;
    }

    private addSearchFilter(query: SelectQueryBuilder<AllTransactionView>, search: string) {
        const searchColumns = [
            'transaction_code',
            'fund_name',
            'fund_code',
            'transaction_type',
            'source_account_number',
            'destination_account_number'
        ];

        /**
         * search with `ilike`
         * for ts_vector approach: https://gitlab.com/SpireDigital1/the-signatry/signatry/-/tree/TS-1224-tsvector
         */
        query.andWhere(
            searchColumns.map(column => `${query.alias}.${column} ILIKE :search`).join(' OR '),
            { search: '%' + search + '%' }
        );

        return query;
    }

    @Query(type => AllTransactionResults)
    @PermissionLock(PermissionAccessType.ADMIN_TRANSACTIONS_ALL, PermissionAccessLevel.READ)
    public async allTransactions(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', type => AllTransactionOrderBy, { nullable: true })
        orderBy?: AllTransactionOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => AllTransactionFilter, { nullable: true })
        where?: AllTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<AllTransactionResults> {
        const repo = context.typeorm.getRepository(AllTransactionView);
        // generate queries
        const query = this.createQuery(repo, null, orderBy, skip, take, null);
        const countQuery = this.createQuery(repo);
        const totalCountQuery = this.createQuery(repo);

        // refresh view on page load
        if (where.refresh) {
            await repo.query(`REFRESH MATERIALIZED VIEW ${repo.metadata.givenTableName};`);
        }

        // add search
        if (search) {
            [query, countQuery].forEach(q => {
                this.addSearchFilter(q, search);
            });
        }

        // add filtering
        if (where) {
            [query, countQuery].forEach(q => {
                this.addWhereFilter(q, where);
            });
        }

        return Promise.all([
            this.getTimestamp(context),
            query.getMany(),
            totalCountQuery.getCount(),
            countQuery.getCount()
        ]).then(([timestamp, data, totalCount, count]) => ({
            timestamp,
            data,
            totalCount,
            count
        }));
    }

    @Query(type => [String])
    @PermissionLock(PermissionAccessType.ADMIN_FUND_TRANSFERS, PermissionAccessLevel.READ)
    public async allTransactionIds(
        @Ctx() context: GraphQLContext,
        @Arg('where', type => AllTransactionFilter, { nullable: true })
        where?: AllTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<string[]> {
        const repo = context.typeorm.getRepository(AllTransactionView);
        const query = this.createQuery(repo, where, null, null, null, search).select(
            'entity.id',
            'id'
        );

        return await context.typeorm
            .query(...query.getQueryAndParameters())
            .then(records => records.map((record: { id: string }) => record.id));
    }

    @Query(type => FilterTypeResults)
    allTransactionFilterTypes(@Ctx() context: GraphQLContext): FilterTypeResults {
        return { types: Object.values(AllTransactionTypes) };
    }

    @Query(type => FilterValueResults)
    public async allTransactionFilterValues(
        @Ctx() context: GraphQLContext,
        @Arg('filter', type => AllTransactionTypes, { nullable: true })
        filter?: AllTransactionTypes,
        @Arg('where', type => AllTransactionFilter, { nullable: true })
        where?: AllTransactionFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<FilterValueResults> {
        const repo = context.typeorm.getRepository(AllTransactionView);

        const columnName = this.mapEnumValueToColumn(filter);

        const columns: string[] = [columnName];
        let textKey: string;
        let formatter = (val: any): any => val;

        switch (filter) {
            case AllTransactionTypes.TYPE:
            case AllTransactionTypes.STATUS:
                formatter = statusFormatter;
                break;

            case AllTransactionTypes.FUND:
                textKey = 'fundName';
                break;

            case AllTransactionTypes.SOURCE:
                textKey = 'sourceAccountTitle';
                break;

            case AllTransactionTypes.DESTINATION:
                textKey = 'destinationAccountTitle';
                break;
        }

        const query = repo
            .createQueryBuilder('entity')
            .select(
                columns
                    .concat(textKey)
                    .filter(Boolean)
                    .map(c => `entity.${c}`)
            )
            .distinct(true);

        if (where) {
            this.addWhereFilter(query, where);
        }

        if (search) {
            this.addSearchFilter(query, search);
        }

        const [timestamp, results] = await Promise.all([
            this.getTimestamp(context),
            query.getMany()
        ]);

        const data: FilterValueResults['data'] = [];
        let keys = [];

        results.forEach(transaction => {
            const value = transaction[columnName];
            /** @todo remove this check once we have source/destination data */
            if (!keys.includes(value)) {
                keys.push(value);
                data.push({
                    value,
                    text: formatter(transaction[textKey || columnName])
                });
            }
        });

        return {
            timestamp,
            data
        };
    }
}
