import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { FundTransactionBatch } from '../models/FundTransactionBatch';
import { UtilityResolver } from '../graphql/core/UtilityResolver';

import { GraphQLContext } from '../context';
import { FundTransaction } from '../models';

@Resolver(type => FundTransactionBatch)
export class FundTransactionBatchResolver extends UtilityResolver {
    @FieldResolver(type => [FundTransaction])
    public async fundTransaction(
        @Root() root: FundTransactionBatch,
        @Ctx() context: GraphQLContext
    ) {
        return context.typeorm
            .getRepository(FundTransaction)
            .find({ fundTransactionBatchId: root.id });
    }
}
