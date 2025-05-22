import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { TransactionEvent, UserProfile, FundTransaction } from '../models';

@Resolver(type => TransactionEvent)
export class TransactionEventResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async userProfile(@Root() root: TransactionEvent, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(UserProfile).findOne({ id: root.userProfileId });
    }

    @FieldResolver(type => FundTransaction)
    public async fundTransaction(@Root() root: TransactionEvent, @Ctx() context: GraphQLContext) {
        return context.typeorm
            .getRepository(FundTransaction)
            .findOne({ id: root.fundTransactionId });
    }

    @FieldResolver(type => [TransactionEvent])
    public async childEvents(@Root() root: TransactionEvent, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(TransactionEvent).find({ parentEventId: root.id });
    }

    @FieldResolver(type => TransactionEvent)
    public async parentEvent(@Root() root: TransactionEvent, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(TransactionEvent).findOne({ id: root.parentEventId });
    }
}
