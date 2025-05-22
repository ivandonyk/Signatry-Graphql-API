import { FundTransactionSource } from '../models/FundTransactionSource';
import { FundTransaction } from '../models/FundTransaction';
import { UserProfileAccount } from '../models/UserProfileAccount';
import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';

@Resolver(type => FundTransactionSource)
export class FundTransactionSourceResolver extends UtilityResolver {
    @FieldResolver(type => [FundTransaction])
    public async fundTransactions(@Root() root: FundTransactionSource, @Ctx() context: any) {
        return context.typeorm.getRepository(FundTransaction).find({
            fundTransactionSourceId: root.id
        });
    }

    @FieldResolver(type => UserProfileAccount)
    public async userProfileAccount(@Root() root: FundTransactionSource, @Ctx() context: any) {
        return context.typeorm.getRepository(UserProfileAccount).findOne({
            id: root.userProfileAccountId
        });
    }
}
