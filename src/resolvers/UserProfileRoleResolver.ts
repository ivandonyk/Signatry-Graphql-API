import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { Role, UserProfileRole, UserProfile } from '../models';

@Resolver(type => UserProfileRole)
export class UserProfileRoleResolver extends UtilityResolver {
    @FieldResolver(type => Role)
    public async role(@Root() root: UserProfileRole, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(Role).findOne({ id: root.roleId });
    }

    @FieldResolver(type => UserProfile)
    public async userProfile(@Root() root: UserProfileRole, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(UserProfile).findOne({ id: root.userProfileId });
    }
}
