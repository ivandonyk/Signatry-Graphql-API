import { Repository, SelectQueryBuilder, EntityManager, ObjectLiteral } from 'typeorm';
import { OrderBy } from '../../inputs/core/OrderBy';
import { BaseResolver } from './BaseResolver';
import CreateQueryError from '../../errors/CreateQueryError';
import { TransactionEntityMetadataArgs } from 'typeorm/metadata-args/TransactionEntityMetadataArgs';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';

// Operator mappings from GraphQL to SQL
const operators = {
    equal: '=',
    moreThan: '>',
    moreThanOrEqual: '>=',
    lessThan: '<',
    lessThanOrEqual: '<=',
    in: 'IN',
    notIn: 'NOT IN'
};

// Contains basic utility method(s) for resolving GraphQL queries
export class UtilityResolver extends BaseResolver {
    // Generate a query builder with relevant skip, take, where, and order by clauses
    public createQuery<TEntity>(
        repo: Repository<TEntity>,
        where?: any,
        orderBy?: any,
        skip?: number,
        take?: number,
        search?: string,
        rankSearch = true,
        searchOperator = '|',
        vectorColumn = 'search_vector'
    ): SelectQueryBuilder<TEntity> {
        // Create query builder with alias of 'entity'
        const builder = repo.createQueryBuilder('entity');

        // Get entity relations
        const relations = repo.metadata.ownRelations;

        // Parameter number (used to generate unique parameter names)
        const paramNames = [];

        // Add skip statement
        if (skip) builder.skip(skip);

        // Add take statement
        if (take) builder.take(take);

        // Add order by clause(s)
        this.addOrderBy(repo, builder, relations, orderBy);

        // Add where clause(s)
        if (where) {
            // Iterate thru all property clauses
            for (const propName in where) {
                if (propName === '_customQuery') {
                    const customQuery = where['_customQuery'];

                    if (Array.isArray(customQuery)) {
                        customQuery.forEach(
                            (cQuery: {
                                join?: string;
                                entity?: string;
                                queryString?: string;
                                variableObject?: ObjectLiteral;
                            }) => this.addCustomQuery(cQuery, builder)
                        );
                    } else {
                        this.addCustomQuery(customQuery, builder);
                    }
                } else {
                    // Get property value from where clause
                    const propValue = where[propName];

                    // If simple scalar
                    if (typeof propValue !== 'object') {
                        this.addScalarWhere(builder, `entity.${propName}`, propValue, paramNames);
                        continue;
                    }

                    // If property corresponds to a relation
                    const relation = relations.find(relation => relation.propertyName === propName);

                    if (relation) {
                        this.addRelationWhere(
                            builder,
                            'entity',
                            propName,
                            propValue,
                            paramNames,
                            relation,
                            repo.manager
                        );
                        continue;
                    }

                    // If comparison operator
                    if (typeof propValue === 'object') {
                        this.addComparisonWhere(
                            builder,
                            `entity.${propName}`,
                            propValue,
                            paramNames
                        );
                        continue;
                    }
                }
            }
        }

        // Add search query
        if (search) {
            // Format tsquery
            const query = search
                .replace(/[^a-zA-Z0-9\s]/g, ' ')
                .split(' ')
                .filter(s => s.length)
                .map(s => `${s.trim()}:*`)
                .join([' ', searchOperator.trim(), ' '].join(''));

            if (rankSearch) {
                // Add rank
                builder.addSelect(`ts_rank_cd(entity.${vectorColumn}, :query, 1)`, 'rank');
                // Order by rank
                builder.addOrderBy('rank', 'DESC');
            }
            // tsvector search
            builder.andWhere(`entity.${vectorColumn} @@ to_tsquery('simple', :query)`, {
                query
            });
        }

        // Return generated query builder
        return builder;
    }

    protected addCustomQuery<TEntity>(
        customQuery: {
            join?: string;
            entity?: string;
            queryString?: string;
            variableObject?: ObjectLiteral;
        },
        builder: SelectQueryBuilder<TEntity>
    ): SelectQueryBuilder<TEntity> {
        const { variableObject, queryString, join, entity } = customQuery;

        if (!!entity && !!join) {
            this.builderRelationUniquenessChecker(builder, `${entity}.${join}`, join);

            if (!!queryString && !!variableObject) {
                builder.andWhere(queryString, variableObject);
            }
        }

        return builder;
    }

    protected addScalarWhere<TEntity>(
        builder: SelectQueryBuilder<TEntity>,
        propName: string,
        propValue: number | boolean | string,
        paramNames: string[]
    ): SelectQueryBuilder<TEntity> {
        // Generate unique parameter name
        const paramName = 'p' + paramNames.length;
        paramNames.push(paramName);

        // Assign parameter value
        const parameters: any = {};
        parameters[paramName] = propValue;

        // Add simple equality where clause
        return builder.andWhere(`${propName} = :${paramName}`, parameters);
    }

    protected addComparisonWhere<TEntity>(
        builder: SelectQueryBuilder<TEntity>,
        propName: string,
        propValue: { [key: string]: number | string },
        paramNames: string[]
    ): SelectQueryBuilder<TEntity> {
        // Iterate through comparison inputs
        for (const operatorName in propValue) {
            // Generate unique parameter name
            const paramName = 'p' + paramNames.length;
            paramNames.push(paramName);

            // get SQL operator
            const operator = operators[operatorName];

            if (!operator) {
                throw new CreateQueryError(
                    'Nested value does not match a SQL operator. This usually means that "createQuery" couldn\'t find a relation. Check for typos in your nested relation query.'
                );
            }

            // get predicate value
            const value = propValue[operatorName];

            // assign parameter value
            const parameters: any = {};
            parameters[paramName] = value;

            // Add where clause
            if (operator === operators.in || operator === operators.notIn) {
                return builder.andWhere(`${propName} ${operator} (:...${paramName})`, parameters);
            } else {
                return builder.andWhere(`${propName} ${operator} :${paramName}`, parameters);
            }
        }
    }

    protected addRelationWhere<TEntity>(
        builder: SelectQueryBuilder<TEntity>,
        entity: string,
        propName: string,
        propValue: { [key: string]: number | string },
        paramNames: string[],
        relation: any,
        manager: EntityManager
    ): SelectQueryBuilder<TEntity> {
        this.builderRelationUniquenessChecker(builder, `${entity}.${propName}`, propName);

        // Get entity relations
        const repo = manager.getRepository(relation.type);
        const relations = repo.metadata.ownRelations;

        for (const nestedPropName in propValue) {
            const nestedPropValue = propValue[nestedPropName];

            // If simple scalar
            if (typeof nestedPropValue !== 'object') {
                this.addScalarWhere(
                    builder,
                    `${propName}.${nestedPropName}`,
                    nestedPropValue,
                    paramNames
                );
                continue;
            }

            // If property corresponds to a relation
            const relation = relations.find(relation => relation.propertyName === nestedPropName);
            if (relation) {
                this.addRelationWhere(
                    builder,
                    propName,
                    nestedPropName,
                    nestedPropValue,
                    paramNames,
                    relation,
                    repo.manager
                );
                continue;
            }

            // If comparison operator
            if (typeof nestedPropValue === 'object') {
                this.addComparisonWhere(
                    builder,
                    `${propName}.${nestedPropName}`,
                    nestedPropValue,
                    paramNames
                );
                continue;
            }
        }

        return builder;
    }

    protected addOrderBy<TEntity>(
        repo: Repository<TEntity>,
        builder: SelectQueryBuilder<TEntity>,
        relations: RelationMetadata[],
        orderBy?: any,
        alias = 'entity'
    ) {
        if (orderBy) {
            for (const propName in orderBy) {
                const propValue = orderBy[propName];

                // Super simple order by requests
                if (typeof propValue !== 'object') {
                    this.addBasicOrderBy(builder, alias, propName, propValue);
                    continue;
                }

                const relation = relations.find(relation => relation.propertyName === propName);

                if (relation) {
                    this.addRelationOrderBy(
                        builder,
                        alias,
                        propName,
                        propValue,
                        relation,
                        repo.manager
                    );
                    continue;
                }
            }
        }
    }

    protected addBasicOrderBy<TEntity>(
        builder: SelectQueryBuilder<TEntity>,
        entity: string,
        propName: string,
        propValue: string
    ): SelectQueryBuilder<TEntity> {
        builder.addOrderBy(
            `${entity}.${propName}`,
            propValue === OrderBy.Ascending ? 'ASC' : 'DESC'
        );

        return builder;
    }

    protected addRelationOrderBy<TEntity>(
        builder: SelectQueryBuilder<TEntity>,
        entity: string,
        propName: string,
        propValue: { [key: string]: string },
        relation: any,
        manager: EntityManager
    ): SelectQueryBuilder<TEntity> {
        this.builderRelationUniquenessChecker(builder, `${entity}.${propName}`, propName);

        // Get entity relations
        const repo = manager.getRepository(relation.type);
        const relations = repo.metadata.ownRelations;

        for (const nestedName in propValue) {
            const nestedVal = propValue[nestedName];

            if (typeof nestedVal !== 'object') {
                this.addBasicOrderBy(builder, propName, nestedName, nestedVal);
                continue;
            }

            const nestedRelation = relations.find(relation => relation.propertyName === nestedName);
            if (nestedRelation) {
                this.addRelationOrderBy(
                    builder,
                    propName,
                    nestedName,
                    nestedVal,
                    nestedRelation,
                    repo.manager
                );
            }

            continue;
        }

        return builder;
    }

    public builderRelationUniquenessChecker<TEntity>(
        builder: SelectQueryBuilder<TEntity>,
        // Should look like 'entity.anotherThing' as a string
        desiredJoin: string,
        desiredAlias: string
    ): SelectQueryBuilder<TEntity> {
        // This looks like ['entity.joinInCamelCase']
        const joinList = builder.expressionMap.joinAttributes.map(attribute => {
            return attribute.entityOrProperty;
        });

        if (!joinList.includes(desiredJoin)) {
            builder.leftJoinAndSelect(desiredJoin, desiredAlias);
        }

        return builder;
    }
}
