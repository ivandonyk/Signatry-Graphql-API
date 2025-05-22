import { Resolver, FieldResolver, Ctx, Root, Query } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { Role, UserProfileRole, Invitation } from '../models';

@Resolver(type => Role)
export class RoleResolver extends UtilityResolver {
    @FieldResolver(type => [UserProfileRole])
    public async userProfileRole(@Root() root: Role, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(UserProfileRole).find({ roleId: root.id });
    }

    @FieldResolver(type => [Invitation])
    public async invitations(@Root() root: Role, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(Invitation).find({ roleId: root.id });
    }
}
