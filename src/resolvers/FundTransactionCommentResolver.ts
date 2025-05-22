import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { FundTransactionComment, TransactionStatus } from '../models';
import { UtilityResolver } from '../graphql/core/UtilityResolver';

import { GraphQLContext } from '../context';
import { FundTransaction, UserProfile } from '../models';

@Resolver(type => FundTransactionComment)
export class FundTransactionCommentResolver extends UtilityResolver {
    @FieldResolver(type => FundTransaction)
    public async fundTransaction(
        @Root() root: FundTransactionComment,
        @Ctx() context: GraphQLContext
    ) {
        return context.typeorm
            .getRepository(FundTransaction)
            .findOne({ id: root.fundTransactionId });
    }

    @FieldResolver(type => TransactionStatus)
    public async transactionStatus(
        @Root() root: FundTransactionComment,
        @Ctx() context: GraphQLContext
    ) {
        return context.typeorm.getRepository(TransactionStatus).findOne({
            id: root.transactionStatusId
        });
    }

    @FieldResolver(type => UserProfile)
    public async author(@Root() root: FundTransactionComment, @Ctx() context: GraphQLContext) {
        const profile = await context.typeorm.getRepository(UserProfile).findOne({
            id: root.createdBy
        });
        return profile;
    }
}
