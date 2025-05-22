import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';

import { GraphQLContext } from '../context';
import { Batch, BatchComment, FundTransactionDetail, GLAccount } from '../models';

@Resolver(type => Batch)
export class BatchResolver extends UtilityResolver {
    @FieldResolver(type => GLAccount)
    public async sourceGLAccount(@Root() root: Batch, @Ctx() context: GraphQLContext) {
        if (!root.sourceGLAccount) {
            root.sourceGLAccount = await context.typeorm
                .getRepository(GLAccount)
                .findOne({ id: root.sourceGLAccountId });
        }
        return root.sourceGLAccount;
    }

    @FieldResolver(type => GLAccount)
    public async destinationGLAccount(@Root() root: Batch, @Ctx() context: GraphQLContext) {
        if (!root.destinationGLAccount) {
            root.destinationGLAccount = await context.typeorm
                .getRepository(GLAccount)
                .findOne({ id: root.destinationGLAccountId });
        }
        return root.destinationGLAccount;
    }

    @FieldResolver(type => [FundTransactionDetail])
    public async transactions(@Root() root: Batch, @Ctx() context: GraphQLContext) {
        if (!root.transactions) {
            root.transactions = await context.typeorm
                .getRepository(FundTransactionDetail)
                .find({ batchId: root.id });
        }
        return root.transactions;
    }

    @FieldResolver(type => [BatchComment])
    public async comments(@Root() root: Batch, @Ctx() context: GraphQLContext) {
        if (!root.comments) {
            root.comments = await context.typeorm
                .getRepository(BatchComment)
                .find({ batchId: root.id });
        }
        return root.comments;
    }
}
