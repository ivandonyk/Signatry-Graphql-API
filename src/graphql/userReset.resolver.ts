import AWS from 'aws-sdk';
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';

import { UtilityResolver } from './core/UtilityResolver';
import { PermissionLock } from '../decorators/permissionDecorator';
import { PermissionAccessType, PermissionAccessLevel } from '../models/Permission';
import { GraphQLContext } from '../context';
import { AppUser, UserProfileEmail, UserProfilePhone } from '../models';
import { generateTemporaryPassword } from '../utilities/temporaryPassword';
import UserAlreadyResetError from '../errors/UserAlreadyResetError';

@Resolver()
export class UserResetResolver extends UtilityResolver {
    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean)
    async resetUserPassword(
        @Ctx() context: GraphQLContext,
        @Arg('userProfileId') userProfileId: string
    ): Promise<boolean> {
        const cognitoIdSP = new AWS.CognitoIdentityServiceProvider();

        const userPool = process.env.USERPOOL_ID;

        const appUser = await context.typeorm.manager
            .getRepository(AppUser)
            .createQueryBuilder('appUser')
            .leftJoinAndSelect('appUser.userProfile', 'userProfile')
            .where('userProfile.id = :userProfileId', { userProfileId })
            .getOne();

        try {
            const resetResult = await cognitoIdSP
                .adminResetUserPassword({
                    UserPoolId: userPool,
                    Username: appUser.username
                })
                .promise();
        } catch (e) {
            if ((e.message = 'User password cannot be reset in the current state.')) {
                throw new UserAlreadyResetError(e.message);
            } else {
                throw new Error(e.message);
            }
        }

        return new Promise(resolve => resolve(true));
    }

    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean)
    async fullyResetUserLogin(
        @Ctx() context: GraphQLContext,
        @Arg('userProfileId', { nullable: false }) userProfileId: string,
        @Arg('newEmailAddress', { nullable: true }) newEmailAddress?: string
    ): Promise<boolean> {
        const cognitoIdSP = new AWS.CognitoIdentityServiceProvider();
        const emailRepo = context.typeorm.manager.getRepository(UserProfileEmail);
        const phoneRepo = context.typeorm.manager.getRepository(UserProfilePhone);
        const appUserRepo = context.typeorm.manager.getRepository(AppUser);
        const userPool = process.env.USERPOOL_ID;

        const tempPassword = generateTemporaryPassword();

        const appUser = await appUserRepo
            .createQueryBuilder('appUser')
            .leftJoinAndSelect('appUser.userProfile', 'userProfile')
            .where('userProfile.id = :userProfileId', { userProfileId })
            .getOne();

        const primaryEmail = await emailRepo
            .createQueryBuilder('email')
            .where('email.userProfileId = :userProfileId', { userProfileId })
            .andWhere('email.isPrimary = TRUE')
            .getOne();

        const primaryPhone = await phoneRepo
            .createQueryBuilder('phone')
            .where('phone.userProfileId = :userProfileId', { userProfileId })
            .andWhere('phone.isPrimary = TRUE')
            .getOne();

        if (newEmailAddress) {
            if (primaryEmail) {
                primaryEmail.value = newEmailAddress;
                await emailRepo.save(primaryEmail);
            } else {
                await emailRepo.create({
                    enabled: true,
                    isPrimary: true,
                    value: newEmailAddress,
                    userProfileId
                });
            }
        } else if (!primaryEmail) {
            throw new Error('User has no valid email address, please provide one.');
        }

        const cognitoEmail = newEmailAddress ? newEmailAddress : primaryEmail.value;

        const deleteUser = async () => {
            try {
                return cognitoIdSP
                    .adminDeleteUser({
                        UserPoolId: userPool,
                        Username: appUser.username
                    })
                    .promise();
            } catch (error) {
                throw new Error(`Error deleting Cognito user: ${error.message}`);
            }
        };

        const updateDbUser = async (sub: string, email: string) => {
            appUser.sub = sub;
            appUser.emailAddress = email;
            appUser.username = email;

            return appUserRepo.save(appUser);
        };

        const createUser = async () => {
            const attributes = [
                {
                    Name: 'email',
                    Value: cognitoEmail
                },
                {
                    Name: 'given_name',
                    Value: appUser.userProfile.firstName
                },
                {
                    Name: 'family_name',
                    Value: appUser.userProfile.lastName
                },
                {
                    Name: 'email_verified',
                    Value: 'true'
                },
                {
                    Name: 'phone_number_verified',
                    Value: 'false'
                }
            ];

            if (primaryPhone) {
                attributes.push({
                    Name: 'phone_number',
                    Value: primaryPhone.value.replace(/^(?!\+1)/, '+1')
                });
            }
            try {
                await deleteUser();

                return cognitoIdSP
                    .adminCreateUser({
                        UserPoolId: userPool,
                        Username: cognitoEmail,
                        TemporaryPassword: tempPassword,
                        UserAttributes: attributes,

                        DesiredDeliveryMediums: ['EMAIL']
                    })
                    .promise();

                // return res;
            } catch (e) {
                throw new Error(`Error creating Cognito user: ${e.message}`);
            }
        };

        try {
            const newUser = await createUser();
            const newSub = newUser.User.Attributes.find(attr => attr.Name === 'sub');
            await updateDbUser(newSub.Value, cognitoEmail);

            return true;
        } catch (e) {
            throw new Error(`Error creating Cognito user: ${e.message}`);
        }
    }
}
