import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { Role, Invitation, PendingFundUser } from '../models';

@Resolver(type => Invitation)
export class InvitationResolver extends UtilityResolver {
    @FieldResolver(type => [Role])
    public async role(@Root() root: Invitation, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(Role).find({ id: root.roleId });
    }

    @FieldResolver(type => [PendingFundUser])
    public async pendingFundUser(@Root() root: Invitation, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(PendingFundUser).find({ id: root.pendingFundUserId });
    }
}
