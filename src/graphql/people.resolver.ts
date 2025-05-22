import { Arg, Ctx, Query, Resolver, Int } from 'type-graphql';

import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { PersonSearchResults, UserProfile } from '../models';
import { PeopleOrderBy } from '../inputs/People/PeopleOrderBy';
import { PermissionLock } from '../decorators/permissionDecorator';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

@Resolver()
export class PeopleResolver extends UtilityResolver {
    @Query(type => PersonSearchResults)
    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.READ)
    public async people(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: PeopleOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<PersonSearchResults> {
        const repo = context.typeorm.getRepository(UserProfile);

        let query, countQuery;
        if (!search) {
            query = this.createQuery(repo, null, orderBy, skip, take, search)
                .leftJoinAndSelect('entity.emails', 'emails')
                .leftJoinAndSelect('entity.role', 'role')
                .leftJoinAndSelect('entity.appUser', 'appUser')
                .leftJoinAndSelect('entity.funds', 'funds');
            countQuery = this.createQuery(repo, null, null, null, null, search, false)
                .leftJoinAndSelect('entity.emails', 'emails')
                .leftJoinAndSelect('entity.role', 'role')
                .leftJoinAndSelect('entity.appUser', 'appUser')
                .leftJoinAndSelect('entity.funds', 'funds');
        } else {
            query = this.createUserProfileQuery(repo, null, orderBy, skip, take, search)
                .leftJoinAndSelect('entity.emails', 'emails')
                .leftJoinAndSelect('entity.role', 'role')
                .leftJoinAndSelect('entity.appUser', 'appUser')
                .leftJoinAndSelect('entity.funds', 'funds');
            countQuery = this.createUserProfileQuery(repo, null, null, null, null, search, false)
                .leftJoinAndSelect('entity.emails', 'emails')
                .leftJoinAndSelect('entity.role', 'role')
                .leftJoinAndSelect('entity.appUser', 'appUser')
                .leftJoinAndSelect('entity.funds', 'funds');
        }

        const [data, count] = await Promise.all([query.getMany(), countQuery.getCount()]);

        return {
            count,
            data: data.map(userProfile => ({
                name: userProfile.fullName,
                email: userProfile.emails.find(email => email.isPrimary).value,
                role: userProfile.role.name,
                userProfileId: userProfile.id,
                username: userProfile.appUser?.username || '',
                funds: userProfile.funds
            }))
        };
    }

    createUserProfileQuery(
        repo: Repository<any>,
        where?: any,
        orderBy?: any,
        skip?: number,
        take?: number,
        search?: string,
        rankSearch = true
    ): SelectQueryBuilder<any> {
        const builder = repo.createQueryBuilder('entity');

        const relations = repo.metadata.ownRelations;

        const paramNames = [];

        if (skip) builder.skip(skip);

        if (take) builder.take(take);

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

        if (search) {
            if (rankSearch) {
                builder.addSelect(
                    "levenshtein(:levenshtein, CONCAT(TRIM(entity.firstName), ' ', TRIM(entity.lastName)))",
                    'rank'
                );
                builder.setParameter('levenshtein', search);
                builder.addOrderBy('rank', 'ASC');
            }
            builder.andWhere(
                "CONCAT(TRIM(entity.firstName), ' ', TRIM(entity.lastName)) ILIKE :search OR emails.value ILIKE :search",
                {
                    search: '%' + search + '%'
                }
            );
        }

        return builder;
    }
}
