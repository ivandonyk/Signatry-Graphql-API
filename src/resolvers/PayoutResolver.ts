import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { GraphQLContext } from '../context';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { Payout, FundTransaction } from '../models';

@Resolver(type => Payout)
export class PayoutResolver extends UtilityResolver {
    @FieldResolver(type => FundTransaction)
    public async transactions(@Root() root: Payout, @Ctx() context: GraphQLContext) {
        return context.typeorm
            .getRepository(FundTransaction)
            .createQueryBuilder('fund_transaction')
            .innerJoinAndSelect(
                'payout_fund_transaction',
                'join_table',
                'join_table.fund_transaction_id = fund_transaction.id'
            )
            .where('join_table.payout_id = :payout_id', { payout_id: root.id })
            .getMany();
    }
}
