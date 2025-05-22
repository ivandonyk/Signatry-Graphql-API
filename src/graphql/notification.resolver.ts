import { Resolver, Mutation, Ctx, Arg, Query, Int } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { Notification, UserProfileNotification, AppUser } from '../models';
import { PermissionLock } from '../decorators/permissionDecorator';
import { GraphQLContext } from '../context';
import { CreateNotificationInput } from '../inputs/Notification/CreateNotificationInput';

@Resolver(type => Notification)
export class NotificationResolver extends UtilityResolver {
    /**
     * Create Notification
     * @param GraphQLContext
     * @param CreateNotificationInput
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Notification)
    async createNotification(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateNotificationInput
    ): Promise<Notification> {
        const manager = context.typeorm.manager;
        const profile = await this.getCurrentUserProfile(context);

        const notification = manager.create(Notification, {
            name: input.name
        });

        const { id: notificationId } = await manager.save(notification);

        // Create User Profile Notification record
        await manager.save(
            manager.create(UserProfileNotification, {
                notificationId,
                userProfileId: profile.id
            })
        );

        return notification;
    }

    /**
     * Get User Notifications
     * @param context
     * @param GraphQLContext
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [Notification])
    async userNotifications(@Ctx() context: GraphQLContext) {
        const profile = await this.getCurrentUserProfile(context);
        const repository = context.typeorm.manager.getRepository(Notification);

        return repository
            .createQueryBuilder('notification')
            .leftJoin('notification.userProfiles', 'userProfile')
            .where(':userProfileId IN (userProfile.id)', { userProfileId: profile.id })
            .orderBy('notification.name', 'ASC')
            .getMany();
    }
}
