import NotPermittedError from '../errors/NotPermitted';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

export function PermissionLock(
    accessType: PermissionAccessType,
    level: PermissionAccessLevel
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
            const list = await target.getPermissionList(context);
            const validLevels =
                level === PermissionAccessLevel.READ
                    ? [PermissionAccessLevel.FULL, PermissionAccessLevel.READ]
                    : [PermissionAccessLevel.FULL];

            const includes = list.some(
                permission =>
                    permission.accessType === accessType &&
                    validLevels.includes(permission.accessLevel)
            );
            if (!includes) {
                throw new NotPermittedError("You don't have sufficient privileges.");
            }
            const result = originalMethod.apply(this, args);
            return result;
        };
    };
}
