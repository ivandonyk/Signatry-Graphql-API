import { FundTransactionDetail } from '../models/FundTransactionDetail';
import { Resolver, Mutation, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { FundTransactionDetailRepository } from '../repositories/FundTransactionDetail';

@Resolver(type => FundTransactionDetail)
export class FundTransactionDetailResolver extends UtilityResolver {
    @Mutation(type => [String])
    async setTransactionHold(
        @Ctx() context: GraphQLContext,
        @Arg('detailIds', type => [String]) detailIds: string[],
        @Arg('onHold', type => Boolean) onHold: boolean
    ): Promise<string[]> {
        const detailRepo = context.typeorm.getCustomRepository(FundTransactionDetailRepository);

        const response = await detailRepo
            .createQueryBuilder('detail')
            .update()
            .set({ onHold: onHold })
            .where('id IN (:...detailIds)', { detailIds })
            .returning(['id'])
            .execute();

        return detailIds;
    }
}
