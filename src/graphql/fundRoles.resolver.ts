import { Resolver, Ctx, Query, FieldResolver, Root } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { FundPermission, FundRole } from '../models';

@Resolver(type => FundRole)
export class FundRolesResolver extends UtilityResolver {
    @Query(type => [FundRole])
    public async getFundRoles(@Ctx() context: GraphQLContext): Promise<FundRole[]> {
        return context.typeorm
            .createQueryBuilder(FundRole, 'fundRole')
            .where('fundRole.enabled')
            .getMany();
    }

    @FieldResolver(type => [FundPermission])
    public async fundPermissions(
        @Root() root: FundRole,
        @Ctx() context: GraphQLContext
    ): Promise<FundPermission[]> {
        const repo = context.typeorm.getRepository(FundPermission);
        return await repo.find({ where: { fundRoleId: root.id } });
    }
}
