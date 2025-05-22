import { Resolver, Ctx, Arg, Query, Int } from 'type-graphql';

import { GraphQLContext } from '../context';
import { UtilityResolver } from './core/UtilityResolver';
import { ReconciliationHistory } from '../models';

@Resolver(type => ReconciliationHistory)
export class ReconciliationHistoryResolver extends UtilityResolver {
    @Query(type => [ReconciliationHistory])
    async reconciliationHistory(
        @Ctx() context: GraphQLContext,
        @Arg('glAccountId', type => String, { nullable: false }) glAccountId: string,
        @Arg('currentAmount', type => Int, { nullable: false }) currentAmount: number
    ): Promise<ReconciliationHistory[]> {
        const repo = context.typeorm.manager.getRepository(ReconciliationHistory);

        return repo.find({
            where: { glAccountId },
            // fetch 10 more
            take: currentAmount + 10,
            order: { createdOn: 'DESC' }
        });
    }
}
