import { Resolver, FieldResolver, Ctx, Root, Info, Query, Mutation, Arg } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import {
    Notification,
    UserProfileNotification,
    Fund,
    UserProfile
} from '../models';

@Resolver(type => UserProfileNotification)
export class UserProfileNotificationResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async user(
        @Root() root: UserProfileNotification,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const profile = await context.typeorm.getRepository(UserProfile).findOne({
            id: root.userProfileId
        });
        return profile;
    }

    @FieldResolver(type => Notification)
    public async notification(
        @Root() root: UserProfileNotification,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const notification = await context.typeorm.getRepository(Notification).findOne({
            id: root.notificationId
        });
        return notification;
    }

    @FieldResolver(type => Fund)
    public async fund(
        @Root() root: UserProfileNotification,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const fund = await context.typeorm.getRepository(Fund).findOne({
            id: root.fundId
        });
        return fund;
    }
}
