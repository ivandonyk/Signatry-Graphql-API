import { FundTransactionInfo } from '../models/FundTransactionInfo';
import { FundTransaction } from '../models/FundTransaction';
import { Recipient } from '../models/Recipient';
import { UserProfile } from '../models/UserProfile';
import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => FundTransactionInfo)
export class FundTransactionInfoResolver extends UtilityResolver {
    // Fund transaction
    @FieldResolver(type => FundTransaction)
    public async fundTransaction(
        @Root() root: FundTransactionInfo,
        @Ctx() context: GraphQLContext
    ) {
        return context.typeorm.getRepository(FundTransaction).findOne({
            id: root.fundTransactionId
        });
    }

    // Fund transaction destination recipient
    @FieldResolver(type => Recipient)
    public async recipient(@Root() root: FundTransactionInfo, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(Recipient).findOne({
            id: root.recipientId
        });
    }
}
