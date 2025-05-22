import { RecipientEvent } from './../models/RecipientEvent';
import { Resolver, FieldResolver, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { UserProfile, Recipient } from '../models';

@Resolver(type => RecipientEvent)
export class RecipientEventResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async userProfile(@Root() root: RecipientEvent, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(UserProfile).findOne({ id: root.userProfileId });
    }

    @FieldResolver(type => Recipient)
    public async recipient(@Root() root: RecipientEvent, @Ctx() context: GraphQLContext) {
        return context.typeorm.getRepository(Recipient).findOne({ id: root.recipientId });
    }
}
