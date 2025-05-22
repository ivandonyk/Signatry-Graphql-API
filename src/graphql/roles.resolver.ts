import { Resolver, Ctx, Query } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { Role } from '../models';

@Resolver(type => Role)
export class RolesResolver extends UtilityResolver {
    @Query(type => [Role])
    public async allEnabledRoles(@Ctx() context: GraphQLContext): Promise<Role[]> {
        return context.typeorm
            .createQueryBuilder(Role, 'role')
            .where('role.enabled')
            .getMany();
    }
}
