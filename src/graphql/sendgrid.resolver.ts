import { Resolver, Mutation, Arg } from 'type-graphql';
import { send } from '@sendgrid/mail';
import { Permissions } from '../types/permissionsList';
import { PermissionLock } from '../decorators/permissionDecorator';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver()
export class SendgridResolver {
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean)
    async sendgrid(
        @Arg('templateId') templateId: string,
        @Arg('data') data: string,
        @Arg('to') to: string,
        @Arg('from') from: string
    ): Promise<boolean> {
        const response = await send({
            from: from,
            to: to,
            templateId: templateId,
            dynamicTemplateData: JSON.parse(data)
        });

        return true;
    }
}
