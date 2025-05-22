import { PermissionAccessLevel } from '../../models/Permission';
import { PermissionAccessType } from '../../models/Permission';
import { GraphQLContext } from '../../context';
import { UserProfile, AppUser, Fund, Permission, FundPermission } from '../../models';
import NotPermittedError from '../../errors/NotPermitted';

type PotentiallyImpersonatedProfileResponse = {
    profile: UserProfile;
    isImpersonated: boolean;
};

export abstract class BaseResolver {
    protected async getCurrentUserProfile(context: GraphQLContext): Promise<UserProfile> {
        // dev mode profile override
        if (process.env.NODE_ENV === 'development' && process.env.PROFILE_OVERRIDE) {
            return context.typeorm.getRepository(UserProfile).findOne(process.env.PROFILE_OVERRIDE);
        }

        // Check if User Exists
        if (!context.user || !context.user.sub)
            throw new Error('No user.sub found on GraphQL context.');

        // Get AppUser Record
        const appUser = await context.typeorm
            .createQueryBuilder(AppUser, 'a')
            .where('a.sub = :sub', {
                sub: context.user.sub
            })
            .getOne();

        // Return NULL if no AppUser Record
        if (!appUser) {
            console.debug(`unable to find user with appUser.sub -> ${context.user.sub}`);
            throw new Error(`No appUser found with given sub value: ${context.user.sub}`);
        }

        // Get UserProfile
        const userProfile = await context.typeorm
            .createQueryBuilder(UserProfile, 'user')
            .leftJoinAndSelect('user.appUser', 'appUser')
            .where('app_user_id = :appUserId', {
                appUserId: appUser.id
            })
            .getOne();

        if (!userProfile) {
            console.debug(`unable to find userprofile with appuser.id -> ${appUser.id}`);
            throw new Error(`No userProfile was found with given appUser.id: ${appUser.id}`);
        }

        return userProfile;
    }

    protected async getImpersonatedProfile(
        context: GraphQLContext,
        profileId: string
    ): Promise<UserProfile | null> {
        const userProfile = await context.typeorm
            .createQueryBuilder(UserProfile, 'user')
            .leftJoinAndSelect('user.appUser', 'appUser')
            .where({ id: profileId })
            .getOne();
        return userProfile;
    }

    protected async getPotentiallyImpersonatedProfile(
        context: GraphQLContext
    ): Promise<PotentiallyImpersonatedProfileResponse> {
        const profileId = context?.headers?.['edison-impersonation'];

        if (profileId) {
            const permissionList = await this.getPermissionList(context);

            const allowedToImpersonate = permissionList.some(
                permission =>
                    permission.accessType === PermissionAccessType.ADMIN_USER_MANAGEMENT &&
                    permission.accessLevel === PermissionAccessLevel.FULL
            );

            if (allowedToImpersonate) {
                const profile = await this.getImpersonatedProfile(context, profileId);
                return {
                    profile,
                    isImpersonated: true
                };
            } else {
                throw new NotPermittedError("You don't have sufficient privileges");
            }
        }
        const profile = await this.getCurrentUserProfile(context);

        return {
            profile,
            isImpersonated: false
        };
    }

    protected async getPermissionList(context: GraphQLContext): Promise<Permission[]> {
        const profile = await this.getCurrentUserProfile(context);

        const permissions = await context.typeorm
            .createQueryBuilder(Permission, 'permission')
            .leftJoinAndSelect('permission.role', 'role')
            .leftJoinAndSelect('role.userProfileRoles', 'upRole')
            .where('upRole.userProfileId = :id', { id: profile.id })
            .getMany();

        return permissions;
    }

    protected async getUserFundPermissions(
        context: GraphQLContext,
        fund: Fund
    ): Promise<FundPermission[]> {
        const profile = await this.getCurrentUserProfile(context);

        const permissionsOnFund = await context.typeorm
            .createQueryBuilder(FundPermission, 'fundPermission')
            .select('fundPermission.name')
            .innerJoinAndSelect('fundPermission.fundRoles', 'fundRoles')
            .innerJoinAndSelect(
                'fund_role_user_profile',
                'fundRoleUser',
                'fundRoleUser.fundRoleId = fundRoles.id'
            )
            .where('fundRoleUser.userProfileId = :id', { id: profile.id })
            .andWhere('fundRoleUser.fundId = :id', { id: fund.id })
            .getMany();
        return permissionsOnFund;
    }

    protected async getTimestamp(context: GraphQLContext): Promise<Date> {
        return context.typeorm
            .query('SELECT CURRENT_TIMESTAMP')
            .then(res => res[0].current_timestamp);
    }
}
