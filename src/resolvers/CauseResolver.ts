import { Resolver, FieldResolver, Ctx, Root, Int, Arg, Query } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { Cause, Tenant } from '../models';
import { CauseOrderBy } from '../inputs/Cause/CauseOrderBy';
import { CauseFilter } from '../inputs/Cause/CauseFilter';

@Resolver(type => Cause)
export class CauseResolver extends UtilityResolver {
    @Query(type => [Cause])
    public async getCauses(
        @Root() root: Cause,
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: CauseOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => CauseFilter, { nullable: true })
        where?: CauseFilter,
        @Arg('search', type => String, { nullable: true }) search?: string,
        @Arg('searchOperator', type => String, { nullable: true }) searchOperator?: string
    ) {
        const repo = context.typeorm.getRepository(Cause);
        return this.createQuery(repo, where, orderBy, skip, take, search, true, searchOperator).getMany();
    }

    @FieldResolver(type => Int)
    public async recentGrantCount(@Root() root: Cause, @Ctx() context: GraphQLContext) {
        const { manager } = context.typeorm;

        // get interval setting
        const interval = await manager
            .getRepository(Tenant)
            .findOne()
            .then(tenant => tenant.appSetting.charityCurationSettings.recentGrantCountInterval)
            .catch(error => {
                console.log(error);
                return 'month';
            });

        const [result] = await manager
            .createQueryBuilder(Cause, 'cause')
            .select('count(destination) as recent_grant_count')
            .leftJoin('cause.recipients', 'recipient')
            .leftJoin('recipient.fundDestinations', 'destination')
            .where(`destination.createdOn > 'now'::timestamp - '1 ${interval}'::interval`)
            .andWhere('cause.id = :id', { id: root.id })
            .groupBy('cause.id')
            .getRawMany();

        if (!result) return 0;

        return result.recent_grant_count;
    }
}
