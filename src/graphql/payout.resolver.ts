import { Resolver, FieldResolver, Query, Ctx, Root, Arg, Int } from 'type-graphql';
import { Payout } from '../models';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { PayoutOrderBy } from '../resolvers/PayoutOrderBy';
import { PayoutFilter } from '../resolvers/PayoutFilter';

@Resolver(type => Payout)
export class PayoutResolver extends UtilityResolver {
    @Query(type => [Payout])
    public async payouts(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: PayoutOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => PayoutFilter, { nullable: true }) where?: PayoutFilter
    ): Promise<Payout[]> {
        const repo = context.typeorm.getRepository(Payout);
        const query = this.createQuery(repo, where, orderBy, skip, take);
        return await query.getMany();
    }
}
