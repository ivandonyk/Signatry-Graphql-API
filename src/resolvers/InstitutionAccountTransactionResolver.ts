import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';

import { GraphQLContext } from '../context';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { InstitutionAccountTransaction, ProviderAccountData } from '../models';

@Resolver(type => InstitutionAccountTransaction)
export class InstitutionAccountTransactionResolver extends UtilityResolver {
    @FieldResolver(type => ProviderAccountData)
    public async providerAccountData(
        @Root() root: InstitutionAccountTransaction,
        @Ctx() context: GraphQLContext
    ): Promise<ProviderAccountData> {
        return await ProviderAccountData.getProviderAccountData(context, root);
    }
}
