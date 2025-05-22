import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { GLAccount, InstitutionAccount, ProviderAccountData } from '../models';

@Resolver(type => GLAccount)
export class GLAccountResolver extends UtilityResolver {
    @FieldResolver(type => InstitutionAccount)
    public async institutionAccount(@Root() root: GLAccount, @Ctx() context: GraphQLContext) {
        const result = await context.typeorm
            .getRepository(InstitutionAccount)
            .findOne({ glAccountId: root.id, isSweepAccount: false });

        return result;
    }

    @FieldResolver(type => ProviderAccountData)
    public async providerAccountData(
        @Root() root: GLAccount,
        @Ctx() context: GraphQLContext
    ): Promise<ProviderAccountData> {
        return await ProviderAccountData.getProviderAccountDataForGLAccount(context, root);
    }
}
