import NotPermittedError from '../errors/NotPermitted';
import {
    FundPermission,
    FundPermissionAccessType,
    FundPermissionAccessLevel
} from '../models/FundPermission';

import { FundUserProfile } from '../models/FundUserProfile';
import { UserProfile } from '../models/UserProfile';
import { AppUser } from '../models/AppUser';

export function FundPermissionLock(
    accessType: FundPermissionAccessType,
    level: FundPermissionAccessLevel
): any {
    return function decorator(
        target: any,
        propertyKey: string,
        method: TypedPropertyDescriptor<any>
    ): any {
        const originalMethod = method.value;
        method.value = async function(...args) {
            const [context] = args.filter(
                arg => typeof arg === 'object' && Object.keys(arg).includes('typeorm')
            );
            if (!context) {
                throw new Error('No Context Provided');
            }

            // hunt for fundId which is needed for fundPermission check
            let fundId;
            args.map(arg => {
                if (typeof arg === 'object' && arg.fundId) fundId = arg.fundId;
            });
            if (!fundId) {
                throw new Error('No fundId provided. Needed to check fund level permissions');
            }

            // look up fund-permission for this fundId and this user (context.user.sub)
            const permissionsOnFund = await context.typeorm
                .createQueryBuilder(FundPermission, 'fundPermission')
                .select(['fundPermission.accessType', 'fundPermission.accessLevel'])
                .innerJoin(
                    FundUserProfile,
                    'fundUserProfile',
                    'fundPermission.fund_role_id = fundUserProfile.fund_role_id and fundUserProfile.fund_id = :fundId',
                    { fundId }
                )
                .innerJoin(
                    UserProfile,
                    'userProfile',
                    'fundUserProfile.user_profile_id = userProfile.id'
                )
                .innerJoin(
                    AppUser,
                    'appUser',
                    'userProfile.app_user_id = appUser.id and appUser.sub = :subId',
                    { subId: context.user.sub }
                )
                .getMany();

            const validLevels =
                level === FundPermissionAccessLevel.READ
                    ? [FundPermissionAccessLevel.FULL, FundPermissionAccessLevel.READ]
                    : [FundPermissionAccessLevel.FULL];

            const includes = permissionsOnFund.some(
                permission =>
                    permission.accessType === accessType &&
                    validLevels.includes(permission.accessLevel)
            );

            if (!includes) {
                throw new NotPermittedError("You don't have sufficient privileges.");
            }
            return originalMethod.apply(this, args);
        };
    };
}
