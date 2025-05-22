import { Resolver, Query, Ctx, Mutation, Arg, Root, Info, Int, ID } from 'type-graphql';
import { Not, Equal } from 'typeorm';
import _ from 'lodash';
import { GraphQLContext } from '../context';
import { UserProfileOrderBy } from '../inputs/UserProfile/UserProfileOrderBy';
import { UserProfileFilter } from '../inputs/UserProfile/UserProfileFilter';
import { UserProfileInput } from '../inputs/UserProfile/UserProfileInput';
import { UtilityResolver } from './core/UtilityResolver';
import {
    UserProfile,
    AppUser,
    UserProfileEmail,
    UserProfileEvent,
    UserProfilePhone,
    UserProfileAddress,
    UserProfileRole,
    UserProfileNotification,
    Role,
    Invitation,
    PendingFundUser,
    Fund,
    FundUserProfile,
    FundRole,
    FundRelationship,
    PositionType,
    Notification
} from '../models';
import { CreateProfilePhoneInput } from '../inputs/UserProfile/CreateProfilePhoneInput';
import { UpdateProfilePhoneInput } from '../inputs/UserProfile/UpdateProfilePhoneInput';
import { CreateProfileAddressInput } from '../inputs/UserProfile/CreateProfileAddressInput';
import { UpdateProfileAddressInput } from '../inputs/UserProfile/UpdateProfileAddressInput';
import { CreateProfileEmailInput } from '../inputs/UserProfile/CreateProfileEmailInput';
import { UpdateProfileEmailInput } from '../inputs/UserProfile/UpdateProfileEmailInput';
import { UserProfilePayload } from '../inputs/UserProfile/UserProfilePayload';
import { RoleTypeValues } from '../models/Role';
import { PermissionLock } from '../decorators/permissionDecorator';
import AccountAlreadyExistsError from '../errors/AccountAlreadyExists';
import CouldNotCreateAdminError from '../errors/CouldNotCreateAdmin';
import InvalidEmailError from '../errors/InvalidEmail';
import NotPermittedError from '../errors/NotPermitted';
import { validEmailRegex } from '../utilities/validation';
import { AccountingFacade } from '../accounting';
import { UpdateUserProfileInfo } from '../inputs/UserProfile/UpdateUserProfileInfo';
import { AdminUpdateUserProfileInfo } from '../inputs/UserProfile/AdminUpdateUserProfileInfo';
import { PrimaryDeliveryMethods } from '../models/UserProfile';
import { GraphQLUpload } from 'graphql-upload';
import { Upload } from '../types/uploadType';
import StorageClient from '../storage/client';
import { NewUserPayload } from '../inputs/UserProfile/NewUserPayload';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { trackNewSignUp } from '../utilities/segmentConfig';
import { isEmail } from '../utilities/email';
import { AdminCreateUserProfileInput } from '../inputs/UserProfile/AdminCreateUserProfileInputs';
import { AdminResendEmailInviteInput } from '../inputs/UserProfile/AdminResendEmailInvite';
import { ToggleUserProfileNotificationInput } from '../inputs/Notification/ToggleUserProfileNotificationInput';
import { UserProfileEventNameValue } from '../models/UserProfileEvent';


@Resolver(UserProfile)
export class ProfileResolver extends UtilityResolver {
    @Query(type => [UserProfile])
    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.READ)
    public async userProfiles(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: UserProfileOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => UserProfileFilter, { nullable: true })
        where?: UserProfileFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<UserProfile[]> {
        const repo = context.typeorm.getRepository(UserProfile);
        const query = this.createQuery(repo, where, orderBy, skip, take, search);
        const result = await query.getMany();
        return result;
    }

    @Query(type => [UserProfile])
    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.READ)
    public async userProfilesGroupedByFund(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: UserProfileOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('search', type => String, { nullable: true }) search?: string,
        @Arg('searchOperator', type => String, { nullable: true }) searchOperator?: string,
        @Arg('basicSearch', type => Boolean, { nullable: true }) basicSearch?: string
    ): Promise<UserProfile[]> {
        const repo = context.typeorm.getRepository(UserProfile);
        const column = basicSearch ? 'search_vector_basic' : 'search_vector';

        const searchQuery = isEmail(search) ? null : search;
        const query = this.createQuery(
            repo,
            null,
            orderBy,
            skip,
            take,
            searchQuery,
            true,
            searchOperator,
            column
        )
            .leftJoinAndSelect('entity.funds', 'funds')
            .groupBy('entity.id')
            .addGroupBy('funds.id');

        if (searchQuery === null) {
            console.log('THIS IS AN EMAIL');
            query.leftJoin('entity.emails', 'email');
            query.andWhere('email.value LIKE :email', { email: `%${search}%` });
        }

        const result = await query.getMany();
        return result;
    }

    @Query(type => Int)
    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.READ)
    public async userProfilesCount(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('where', type => UserProfileFilter, { nullable: true })
        where?: UserProfileFilter
    ): Promise<number> {
        const repo = context.typeorm.getRepository(UserProfile);
        const query = this.createQuery(repo, where);
        const result = await query.getCount();
        return result;
    }

    @Mutation(type => Boolean)
    public async forgotUsername(
        @Ctx() context: GraphQLContext,
        @Arg('email', { nullable: true }) email: string
    ): Promise<boolean> {
        const manager = context.typeorm.manager;

        const user = await context.typeorm
            .createQueryBuilder<AppUser>(AppUser, 'user')
            .where('user.emailAddress = :email', { email: email })
            .getOne();
        if (!user) return false;
        try {
            await context.email.sendForgotUsernameEmails(manager, user);
        } catch (error) {
            console.log(error);
        }

        return true;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [UserProfile])
    public async getUserProfileByEmail(
        @Ctx() context: GraphQLContext,
        @Arg('email') email: string
    ): Promise<UserProfile[]> {
        const appUser = await context.typeorm
            .createQueryBuilder<AppUser>(AppUser, 'user')
            .select('user.id')
            .where('LOWER(user.emailAddress) = LOWER(:email)', { email })
            .andWhere('enabled=true')
            .getMany();
        let appUserIds = [];
        appUser.map(record => {
            appUserIds.push(record.id);
        });
        const user = await context.typeorm
            .createQueryBuilder<UserProfile>(UserProfile, 'userProfile')
            .innerJoinAndSelect('userProfile.appUser', 'appUser')
            .leftJoinAndSelect('userProfile.primaryAddress', 'primaryAddress')
            .where('userProfile.appUserId IN (:...ids)', { ids: appUserIds })
            .getMany();
        return user;
    }

    @Query(type => Boolean)
    public async emailExists(
        @Ctx() context: GraphQLContext,
        @Arg('email') email: string
    ): Promise<boolean> {
        const count = await context.typeorm
            .createQueryBuilder(UserProfileEmail, 'info')
            .where('LOWER(info.value) = LOWER(:email)', { email })
            .getCount();
        return count > 0;
    }

    @Query(type => UserProfile)
    public async currentProfile(@Ctx() context: GraphQLContext): Promise<UserProfile> {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        return profile;
    }

    @Query(type => Boolean)
    public async checkFundPermission(
        @Ctx() context: GraphQLContext,
        @Arg('accessType') accessType: string,
        @Arg('readAllowed') readAllowed: boolean,
        @Arg('fundCode', { nullable: true }) fundCode?: string,
        @Arg('fundId', { nullable: true }) fundId?: string
    ): Promise<boolean> {
        if (!fundCode && !fundId) {
            throw new Error('Must provide either fundCode or fundId');
        }

        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        const results = await context.typeorm.query(/* sql */ `
            SELECT fp.access_level
            FROM fund_permission fp
            LEFT JOIN fund_role fr
                ON fr.id = fp.fund_role_id
            LEFT JOIN fund_user_profile fup
                ON fup.fund_role_id = fr.id
            LEFT JOIN fund f
                ON f.id = fup.fund_id
            WHERE fup.user_profile_id = '${profile.id}'
            AND ${fundCode ? `f.fund_code = '${fundCode}'` : `f.id = '${fundId}'`}
            AND fp.access_type = '${accessType}'
            LIMIT 1;
        `);

        if (results.length === 0) {
            return false;
        }

        const [{ access_level: accessLevel }] = results;

        if (accessLevel === 'FULL') {
            return true;
        }

        if (readAllowed && accessLevel === 'READ') {
            return true;
        }

        return false;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean)
    async currentUserProfileUpdate(
        @Ctx() context: GraphQLContext,
        @Arg('user') input: UserProfileInput
    ): Promise<boolean> {
        const { profile: user } = await this.getPotentiallyImpersonatedProfile(context);
        user.firstName = input.firstName;
        user.middleName = input.middleName;
        user.lastName = input.lastName;
        await context.typeorm.getRepository(UserProfile).save(user);
        return true;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfilePhone)
    async currentUserProfileCreatePhone(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateProfilePhoneInput
    ): Promise<UserProfilePhone> {
        const { profile: user } = await this.getPotentiallyImpersonatedProfile(context);
        const phoneNumber = context.typeorm.manager.create(UserProfilePhone, input);
        phoneNumber.userProfileId = user.id;
        phoneNumber.enabled = true;
        await context.typeorm.manager.save(phoneNumber);
        return phoneNumber;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfilePhone)
    async currentUserProfileUpdatePhone(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateProfilePhoneInput
    ): Promise<UserProfilePhone> {
        const { profile: user } = await this.getPotentiallyImpersonatedProfile(context);
        await context.typeorm
            .getRepository(UserProfilePhone)
            .update({ id: input.id, userProfileId: user.id }, { ...input });
        if (input.isPrimary === true) {
            // set other profile phone numbers isPrimary to false
            await context.typeorm
                .getRepository(UserProfilePhone)
                .update({ id: Not(Equal(input.id)), userProfileId: user.id }, { isPrimary: false });
        }

        return context.typeorm.manager.findOne(UserProfilePhone, input.id);
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfileEmail)
    async currentUserProfileCreateEmail(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateProfileEmailInput
    ): Promise<UserProfileEmail> {
        const { profile: user } = await this.getPotentiallyImpersonatedProfile(context);
        const email = context.typeorm.manager.create(UserProfileEmail, input);
        email.userProfileId = user.id;
        email.enabled = true;
        await context.typeorm.manager.save(email);
        return email;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfileEmail)
    async currentUserProfileUpdateEmail(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateProfileEmailInput
    ): Promise<UserProfileEmail> {
        const { profile: user } = await this.getPotentiallyImpersonatedProfile(context);
        return await context.typeorm.manager.transaction(async dbTransaction => {
            const appUser = await dbTransaction.findOne(AppUser, { id: user.appUserId });
            const profileEmail = await dbTransaction.findOne(UserProfileEmail, input.id);

            appUser.emailAddress = input.value;
            Object.entries(input).map(([key, value]) => {
                profileEmail[key] = value;
            });

            await dbTransaction.save(appUser);
            await dbTransaction.save(profileEmail);

            return profileEmail;
        });
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfileAddress)
    async currentUserProfileCreateAddress(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateProfileAddressInput
    ): Promise<UserProfileAddress> {
        const { profile: user } = await this.getPotentiallyImpersonatedProfile(context);
        const address = context.typeorm.manager.create(UserProfileAddress, input);
        address.userProfileId = user.id;
        address.enabled = true;
        await context.typeorm.manager.save(address);
        return address;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfileAddress)
    async currentUserProfileUpdateAddress(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateProfileAddressInput
    ): Promise<UserProfileAddress> {
        const { profile: user } = await this.getPotentiallyImpersonatedProfile(context);
        await context.typeorm
            .getRepository(UserProfileAddress)
            .update({ id: input.id, userProfileId: user.id }, { ...input });
        return context.typeorm.manager.findOne(UserProfileAddress, input.id);
    }

    @Mutation(type => UserProfile, {
        description:
            'Creates record of user in our system. Returns false if user already existed and true if the record was created in this instance.'
    })
    public async createUserRecordsInDB(
        @Ctx() context: GraphQLContext,
        @Arg('userPayload')
        userPayload: UserProfilePayload
    ): Promise<UserProfile> {
        const appUser = await context.typeorm.manager.findOne(AppUser, {
            sub: userPayload.sub,
            username: userPayload.username,
            phoneNumber: userPayload.phoneNumber,
            emailAddress: userPayload.emailAddress
        });
        if (appUser) return null;

        return await context.typeorm.transaction(async manager => {
            // Create App User
            const user = manager.create(AppUser, {
                sub: userPayload.sub,
                username: userPayload.username,
                phoneNumber: userPayload.phoneNumber,
                emailAddress: userPayload.emailAddress,
                enabled: true
            });

            // looks for the code custom attr from cognito
            const code = userPayload.customCode;
            const { id: appUserId } = await manager.save(user);

            // create customer record in accounting
            let customerId: string;
            try {
                customerId = await new AccountingFacade().createCustomer(
                    userPayload.firstName,
                    userPayload.lastName,
                    userPayload.emailAddress
                );
            } catch (error) {
                console.error(`createUserRecordsInDB: Unable to create customer ID for user ${userPayload.emailAddress}: Error - ${error.message}`);
            }

            // Create new Profile Record
            const profile = manager.create(UserProfile, {
                appUserId: appUserId,
                enabled: true,
                accountingCustomerId: customerId,
                firstName: userPayload.firstName,
                lastName: userPayload.lastName,
                ...(userPayload.institution && { institution: userPayload.institution }),
                ...(userPayload.officeName && { officeName: userPayload.officeName })
            });

            // Save profile and grab userProfileId
            const newUserProfile = await manager.save(profile);

            const { id: userProfileId } = newUserProfile;

            trackNewSignUp(manager, userProfileId);

            // variable we will assign the correct role to based on the presence of an admin invitation code
            let userRole: Role;
            // if code exists
            if (!!code && code.trim()) {
                //get the invitation assigned to the code
                const adminInvitation = await manager.findOne(Invitation, {
                    code: code,
                    email: userPayload.emailAddress,
                    enabled: true
                });

                // get the role type as defined in the invitation
                const roleType = await manager.findOne(Role, {
                    id: adminInvitation.roleId
                });

                // get the actual admin roll record itself
                userRole = await manager.findOne(Role, {
                    name: roleType.name
                });

                // update invitation to unenable it
                await manager
                    .createQueryBuilder()
                    .update(Invitation)
                    .set({
                        enabled: false
                    })
                    .where('email = :email AND code = :code ', {
                        email: userPayload.emailAddress,
                        code: code
                    })
                    .execute();

                if (!!adminInvitation.pendingFundUserId) {
                    const pendingUserProfile = await manager.findOne(PendingFundUser, {
                        id: adminInvitation.pendingFundUserId
                    });

                    pendingUserProfile.enabled = false;

                    await manager.save(pendingUserProfile);

                    const fundUserProfile = manager.create(FundUserProfile, {
                        fundId: pendingUserProfile.fundId,
                        userProfileId: userProfileId,
                        fundRoleId: pendingUserProfile.fundRoleId,
                        fundRelationshipId: pendingUserProfile.fundRelationshipId
                    });

                    const fundRole = await manager.findOne(FundRole, {
                        id: fundUserProfile.fundRoleId
                    });

                    const fundRelationship = await manager.findOne(FundRelationship, {
                        id: fundUserProfile.fundRelationshipId
                    });

                    const fund = await manager.findOne(Fund, {
                        id: fundUserProfile.fundId
                    });

                    await manager.save(fundUserProfile);

                    const fundUserProfiles = await manager.find(FundUserProfile, {
                        fundId: fund.id
                    });

                    fundUserProfiles.map(async fundUserProf => {
                        const userProfile = await manager.findOne(UserProfile, {
                            id: fundUserProf.userProfileId
                        });

                        const appUser = await manager.findOne(AppUser, {
                            id: userProfile.appUserId
                        });

                        await context.email.sendNewFundUserAlertToFundHolders(
                            manager,
                            user.username,
                            appUser.emailAddress,
                            fundRole.name,
                            fundRelationship.name,
                            fund.name
                        );
                    });
                }
            } else {
                // if there is no invitation code set the role to user
                userRole = await manager.findOne(Role, {
                    name: RoleTypeValues.DONOR
                });
            }

            // create user profile role
            const userProfileRole = manager.create(UserProfileRole, {
                createdBy: userProfileId,
                updatedBy: userProfileId,
                userProfileId: userProfileId,
                roleId: userRole.id
            });
            // save
            await manager.save(userProfileRole);

            // If there is a phone Number
            if (userPayload.phoneNumber) {
                // Create User Profile Phone
                const phone = manager.create(UserProfilePhone, {
                    userProfileId: profile.id,
                    value: userPayload.phoneNumber,
                    isPrimary: true,
                    enabled: true
                });

                // Save
                await manager.save(phone);
            }

            // If there is an email
            if (userPayload.emailAddress) {
                // Create User Profile Email
                const email = manager.create(UserProfileEmail, {
                    userProfileId: profile.id,
                    value: userPayload.emailAddress,
                    isPrimary: true,
                    enabled: true
                });

                // Save
                await manager.save(email);
            }
            return profile;
        });
    }

    @Mutation(type => UserProfile, {
        description:
            'Adds sub to user after signup to allow for newProfileId to be passed into lambda function for signup'
    })
    public async updateSubAfterSignup(
        @Ctx() context: GraphQLContext,
        @Arg('userPayload')
        userPayload: UserProfilePayload
    ): Promise<AppUser> {
        const manager = context.typeorm.manager;
        const appUser = await manager.findOne(AppUser, {
            username: userPayload.username,
            emailAddress: userPayload.emailAddress
        });

        if (!appUser) return null;

        await manager
            .createQueryBuilder()
            .update(AppUser)
            .set({ sub: userPayload.sub })
            .where('id = :id AND username = :username AND emailAddress = :email', {
                id: appUser.id,
                username: userPayload.username,
                email: userPayload.emailAddress
            })
            .execute();

        return appUser;
    }

    @Mutation(type => Boolean, {
        description:
            'Checks that the email used to signup with an invitation code matches the one on the invitation record'
    })
    async checkEmailMatchesInvite(
        @Ctx() context: GraphQLContext,
        @Arg('code', type => String) code: string,
        @Arg('email', type => String) email: string
    ): Promise<boolean> {
        const manager = context.typeorm.manager;
        const emailMatches = await manager.findOne(Invitation, {
            code: code,
            email: email
        });
        return !!emailMatches;
    }

    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.FULL)
    @Mutation(type => [Invitation], {
        description:
            'creates admin user code for the URL code that determines a users role upon first logging in'
    })
    async createAdminUserCode(
        @Ctx() context: GraphQLContext,
        @Arg('users', type => [NewUserPayload]) users: NewUserPayload[]
    ): Promise<Invitation[]> {
        const errors = [];
        const invalidEmails = users.filter(user => {
            return !validEmailRegex.test(user.email);
        });

        if (invalidEmails.length > 0) {
            invalidEmails.forEach(email => {
                errors.push(new InvalidEmailError(email));
            });
        }

        //  get current profile
        const profile = await this.getCurrentUserProfile(context);
        const manager = context.typeorm.manager;

        const emails = users.map(user => user.email);

        const existing = await manager
            .createQueryBuilder(UserProfileEmail, 'userProfileEmail')
            .select(['userProfileEmail.value'])
            .where('userProfileEmail.value IN (:...emails)', { emails })
            .getMany();

        if (existing.length > 0) {
            const simplified = existing.map(el => el.value);

            simplified.forEach(email => {
                errors.push(new AccountAlreadyExistsError(email));
            });
        }

        if (errors.length > 0) {
            throw new CouldNotCreateAdminError(errors);
        }

        const invitations = await Promise.all(
            users.map(async user => {
                const role = await manager.findOne(Role, user.roleId);
                const invitationRecord = manager.create(Invitation, {
                    roleId: role.id,
                    email: user.email,
                    createdBy: profile.id,
                    updatedBy: profile.id
                });

                const invitation = await manager.save(invitationRecord);
                // send email
                await context.email.sendAdminInvitationEmails(
                    manager,
                    invitation.code,
                    user.email,
                    role.name
                );

                return Promise.resolve(invitation);
            })
        );

        return invitations;
    }

    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfileRole, {
        description: "Updates the passed UserProfile's role to the passed Role"
    })
    async updateRoleForUserProfile(
        @Ctx() context: GraphQLContext,
        @Arg('roleId') roleId: string,
        @Arg('userProfileId') userProfileId: string
    ): Promise<UserProfileRole> {
        // Get the UserProfileRole join table
        const repo = context.typeorm.getRepository(UserProfileRole);
        const userProfileRole = await repo.findOne({
            userProfileId
        });
        // Update the value and return the userProfileRole
        userProfileRole.roleId = roleId;
        await repo.save(userProfileRole);
        return userProfileRole;
    }

    @Query(type => UserProfile)
    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.READ)
    public async getDonorProfile(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('userProfileId', type => ID) userProfileId?: string,
        where?: UserProfileFilter,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<UserProfile> {
        const repo = context.typeorm.getRepository(UserProfile);
        return repo.findOne(userProfileId);
    }

    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfile)
    public async adminUpdateUserProfile(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: AdminUpdateUserProfileInfo
    ): Promise<UserProfile> {
        const manager = context.typeorm.manager;

        // Handle User Profile Updates
        const userProfile = await manager.findOne(UserProfile, {
            id: input.userProfileId
        });

        // Update user profile conditionally based on input
        if (userProfile.primaryDeliveryMethod !== input.primaryDeliveryMethod) {
            userProfile.primaryDeliveryMethod = input.primaryDeliveryMethod as PrimaryDeliveryMethods;
            await manager.save(userProfile);
        }

        if (input.profilePicture && userProfile.profilePicture !== input.profilePicture) {
            userProfile.profilePicture = input.profilePicture;
            await manager.save(userProfile);
        }

        if (input.firstName.length > 0 && userProfile.firstName !== input.firstName) {
            userProfile.firstName = input.firstName;
            await manager.save(userProfile);
        }

        if (input.middleName && userProfile.middleName !== input.middleName) {
            userProfile.middleName = input.middleName;
            await manager.save(userProfile);
        }

        if (input.lastName.length > 0 && userProfile.lastName !== input.lastName) {
            userProfile.lastName = input.lastName;
            await manager.save(userProfile);
        }

        if (input.suffix && userProfile.suffix !== input.suffix) {
            userProfile.suffix = input.suffix;
            await manager.save(userProfile);
        }

        if (input.prefix && userProfile.prefix !== input.prefix) {
            userProfile.prefix = input.prefix;
            await manager.save(userProfile);
        }

        // Handle Address Updates
        const primaryAddress = await manager.findOne(UserProfileAddress, {
            userProfileId: input.userProfileId,
            isPrimary: true
        });
        // Update record if exists else create it
        if (!!input.address) {
            if (primaryAddress !== undefined) {
                if (primaryAddress.lineOne !== input.address.lineOne) {
                    primaryAddress.lineOne = input.address.lineOne;
                }
                if (primaryAddress.lineTwo !== input.address.lineTwo) {
                    primaryAddress.lineTwo = input.address.lineTwo;
                }
                if (primaryAddress.city !== input.address.city) {
                    primaryAddress.city = input.address.city;
                }
                if (primaryAddress.state !== input.address.state) {
                    primaryAddress.state = input.address.state;
                }
                if (primaryAddress.postalCode !== input.address.postalCode) {
                    primaryAddress.postalCode = input.address.postalCode;
                }
                await manager.save(primaryAddress);
            } else {
                const address = manager.create(UserProfileAddress, {
                    userProfileId: userProfile.id,
                    lineOne: input.address.lineOne,
                    lineTwo: input.address.lineTwo,
                    city: input.address.city,
                    state: input.address.state,
                    country: input.address.country,
                    postalCode: input.address.postalCode,
                    isPrimary: true
                });
                await manager.save(address);
            }
        }

        const secondaryAddress = await manager.findOne(UserProfileAddress, {
            userProfileId: input.userProfileId,
            isPrimary: false
        });

        if (!!input.secondAddress) {
            if (secondaryAddress !== undefined) {
                if (secondaryAddress.lineOne !== input.secondAddress.lineOne) {
                    secondaryAddress.lineOne = input.secondAddress.lineOne;
                }
                if (secondaryAddress.lineTwo !== input.secondAddress.lineTwo) {
                    secondaryAddress.lineTwo = input.secondAddress.lineTwo;
                }
                if (secondaryAddress.city !== input.secondAddress.city) {
                    secondaryAddress.city = input.secondAddress.city;
                }
                if (secondaryAddress.state !== input.secondAddress.state) {
                    secondaryAddress.state = input.secondAddress.state;
                }
                if (secondaryAddress.postalCode !== input.secondAddress.postalCode) {
                    secondaryAddress.postalCode = input.secondAddress.postalCode;
                }
                await manager.save(secondaryAddress);
            } else {
                await manager.save(
                    manager.create(UserProfileAddress, {
                        userProfileId: userProfile.id,
                        lineOne: input.secondAddress.lineOne,
                        lineTwo: input.secondAddress.lineTwo,
                        city: input.secondAddress.city,
                        state: input.secondAddress.state,
                        country: input.secondAddress.country,
                        postalCode: input.secondAddress.postalCode,
                        isPrimary: false
                    })
                );
            }
        } else if (!input.secondAddress && secondaryAddress !== undefined) {
            await manager.delete(UserProfileAddress, {
                id: secondaryAddress.id
            });
        }

        // Handle Email Updates
        const primaryEmail = await manager.findOne(UserProfileEmail, {
            userProfileId: input.userProfileId,
            isPrimary: true
        });

        // Update record if exists else create it
        if (!!input.email) {
            if (primaryEmail !== undefined) {
                if (primaryEmail.value !== input.email) {
                    primaryEmail.value = input.email;
                    await manager.save(primaryEmail);
                }
            } else {
                const email = manager.create(UserProfileEmail, {
                    userProfileId: userProfile.id,
                    value: input.email,
                    isPrimary: true
                });
                await manager.save(email);
            }
        }

        const secondaryEmail = await manager.findOne(UserProfileEmail, {
            userProfileId: input.userProfileId,
            isPrimary: false
        });

        // Update record if exists else create it
        if (!!input.secondEmail) {
            if (secondaryEmail !== undefined) {
                if (secondaryEmail.value !== input.secondEmail) {
                    secondaryEmail.value = input.secondEmail;
                    await manager.save(secondaryEmail);
                }
            } else {
                await manager.save(
                    manager.create(UserProfileEmail, {
                        userProfileId: userProfile.id,
                        value: input.secondEmail,
                        isPrimary: false
                    })
                );
            }
        } else if (!input.secondEmail && secondaryEmail !== undefined) {
            await manager.delete(UserProfileEmail, {
                id: secondaryEmail.id
            });
        }

        // Handle Phone Updates
        const primaryPhone = await manager.findOne(UserProfilePhone, {
            userProfileId: input.userProfileId,
            isPrimary: true
        });

        // Update record if exists else create it
        if (!!input.phone) {
            if (primaryPhone !== undefined) {
                if (primaryPhone.value !== input.phone) {
                    primaryPhone.value = input.phone;
                    primaryPhone.type = input.phoneType;
                    await manager.save(primaryPhone);
                }
            } else {
                await manager.save(
                    manager.create(UserProfilePhone, {
                        userProfileId: userProfile.id,
                        value: input.phone,
                        type: input.phoneType,
                        isPrimary: true
                    })
                );
            }
        }

        // Handle Second Phone Updates
        const secondaryPhone = await manager.findOne(UserProfilePhone, {
            userProfileId: input.userProfileId,
            isPrimary: false
        });

        // Update record if exists else create it
        if (!!input.secondPhone) {
            if (secondaryPhone !== undefined) {
                if (secondaryPhone.value !== input.secondPhone) {
                    secondaryPhone.value = input.secondPhone;
                    secondaryPhone.type = input.secondPhoneType;
                    await manager.save(secondaryPhone);
                }
            } else {
                await manager.save(
                    manager.create(UserProfilePhone, {
                        userProfileId: userProfile.id,
                        value: input.secondPhone,
                        type: input.secondPhoneType,
                        isPrimary: false
                    })
                );
            }
        } else if (!input.secondPhone && secondaryPhone !== undefined) {
            await manager.delete(UserProfilePhone, {
                id: secondaryPhone.id
            });
        }

        // Handle `role` and `positionType` Updates
        const userProfileRole = await manager.findOne(UserProfileRole, {
            userProfileId: input.userProfileId
        });

        const role = await manager.findOne(Role, { name: input.role });
        const currentRole = await manager.findOne(Role, { id: userProfileRole.roleId });

        if (!!currentRole && currentRole.name !== role.name) {
            userProfileRole.roleId = role.id;
            await manager.save(userProfileRole);
        }

        if (input.positionType) {
            const positionType = await manager.findOne(PositionType, { name: input.positionType });
            if (userProfile.positionTypeId !== positionType.id) {
                userProfile.positionTypeId = positionType.id;
                await manager.save(userProfile);
            }
        } else if (userProfile.positionTypeId) {
            userProfile.positionTypeId = null;
            await manager.save(userProfile);
        }

        return userProfile;
    }

    @Mutation(type => UserProfile)
    public async updateUserProfile(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateUserProfileInfo
    ): Promise<UserProfile> {
        const profile = await this.getCurrentUserProfile(context);

        if (profile.id !== input.userProfileId) {
            throw new NotPermittedError("You don't have sufficient privileges");
        }

        return this.updateProfile(context, input);
    }

    @Query(type => Boolean)
    public async checkIfUsernameExists(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Arg('username') username: string
    ): Promise<boolean> {
        const appUser = await context.typeorm.manager.findOne(AppUser, {
            username: username
        });

        return !!appUser;
    }

    @Query(type => UserProfile)
    public async getIdFromUserName(
        @Root() root: UserProfile,
        @Ctx() context: GraphQLContext,
        @Arg('username') username: string
    ): Promise<UserProfile> {
        const appUser = await context.typeorm.manager.findOne(AppUser, {
            username: username
        });
        const userProfile = await context.typeorm.manager.findOne(UserProfile, {
            appUserId: appUser.id
        });

        return userProfile;
    }

    @Mutation(type => Boolean)
    public async resendAdminInvitation(
        @Ctx() context: GraphQLContext,
        @Arg('input')
        input: AdminResendEmailInviteInput
    ): Promise<boolean> {
        await context.email.sendAdminUserCreatedInvitationEmails(
            context.typeorm.manager,
            input.email,
            input.username,
            input.firstName,
            input.lastName,
            input.role,
            !!input.phone ? input.phone : undefined
        );
        return true;
    }

    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.FULL)
    @Mutation(type => UserProfile)
    public async adminCreateUserProfile(
        @Ctx() context: GraphQLContext,
        @Arg('input')
        input: AdminCreateUserProfileInput
    ): Promise<UserProfile> {
        return await context.typeorm.transaction(async manager => {
            // Create App User
            const user = manager.create(AppUser, {
                sub: '',
                username: input.username,
                phoneNumber: input.phone,
                emailAddress: input.email,
                enabled: true
            });

            // looks for the code custom attr from cognito
            const { id: appUserId } = await manager.save(user);

            // create customer record in accounting
            const customerId = await new AccountingFacade().createCustomer(
                input.firstName,
                input.lastName,
                input.email
            );

            // Create new Profile Record
            const profile = manager.create(UserProfile, {
                appUserId: appUserId,
                enabled: true,
                accountingCustomerId: customerId,
                firstName: input.firstName,
                lastName: input.lastName
            });

            if (!!input.positionType) {
                const positionType = await manager.findOne(PositionType, {
                    name: input.positionType
                });
                profile.positionTypeId = positionType.id;
            }
            if (!!input.middleName) {
                profile.middleName = input.middleName;
            }
            if (!!input.prefix) {
                profile.prefix = input.prefix;
            }
            if (!!input.suffix) {
                profile.suffix = input.suffix;
            }

            // Save profile and grab userProfileId
            const newUserProfile = await manager.save(profile);

            const { id: userProfileId } = newUserProfile;

            trackNewSignUp(manager, userProfileId);

            // get the role type as defined in the invitation
            const role = await manager.findOne(Role, {
                name: input.role
            });

            // create user profile role
            const userProfileRole = manager.create(UserProfileRole, {
                createdBy: userProfileId,
                updatedBy: userProfileId,
                userProfileId: userProfileId,
                roleId: role.id
            });

            // If there is a phone Number
            // Create User Profile Phone
            let phone;
            if (!!input.phone) {
                phone = manager.create(UserProfilePhone, {
                    userProfileId: profile.id,
                    value: input.phone,
                    isPrimary: true,
                    enabled: true
                });
            }

            // If there is an email
            // Create User Profile Email
            const email = manager.create(UserProfileEmail, {
                userProfileId: profile.id,
                value: input.email,
                isPrimary: true,
                enabled: true
            });

            const address = manager.create(UserProfileAddress, {
                userProfileId: profile.id,
                lineOne: input.address.lineOne,
                lineTwo: input.address.lineTwo,
                city: input.address.city,
                state: input.address.state,
                country: input.address.country,
                postalCode: input.address.postalCode,
                isPrimary: true
            });

            let secondEmail;
            if (input.secondEmail) {
                secondEmail = manager.create(UserProfileEmail, {
                    userProfileId: profile.id,
                    value: input.secondEmail,
                    isPrimary: false,
                    enabled: true
                });
            }
            let secondPhone;
            if (input.secondPhone) {
                secondPhone = manager.create(UserProfilePhone, {
                    userProfileId: profile.id,
                    value: input.secondPhone,
                    isPrimary: false,
                    enabled: true
                });
            }
            let secondAddress;
            if (input.secondAddress) {
                secondAddress = manager.create(UserProfileAddress, {
                    userProfileId: profile.id,
                    lineOne: input.secondAddress.lineOne,
                    lineTwo: input.secondAddress.lineTwo,
                    city: input.secondAddress.city,
                    state: input.secondAddress.state,
                    country: input.secondAddress.country,
                    postalCode: input.secondAddress.postalCode,
                    isPrimary: false
                });
            }

            if (!!input.invitation) {
                await context.email.sendAdminUserCreatedInvitationEmails(
                    manager,
                    input.email,
                    input.username,
                    input.firstName,
                    input.lastName,
                    input.role,
                    !!input.phone ? input.phone : undefined
                );
            }

            // Save
            await Promise.all([
                await manager.save(email),
                await manager.save(userProfileRole),
                await manager.save(address),
                phone && (await manager.save(phone)),
                secondPhone && (await manager.save(secondPhone)),
                secondEmail && (await manager.save(secondEmail)),
                secondAddress && (await manager.save(secondAddress))
            ]);

            return profile;
        });
    }

    private async updateProfile(
        context: GraphQLContext,
        input: UpdateUserProfileInfo
    ): Promise<UserProfile> {
        const repo = context.typeorm.getRepository(UserProfile);

        const userProfile = await repo.findOne({
            id: input.userProfileId
        });

        userProfile.primaryDeliveryMethod = input.primaryDeliveryMethod as PrimaryDeliveryMethods;
        userProfile.profilePicture = input.photo;
        userProfile.firstName = input.firstName;
        userProfile.middleName = input.middleName;
        userProfile.lastName = input.lastName;
        userProfile.prefix = input.prefix;
        userProfile.suffix = input.suffix;

        await repo.save(userProfile);

        /**
         * Phone numbers
         */

        const phoneRepo = context.typeorm.getRepository(UserProfilePhone);

        const currentPhones = await phoneRepo.find({ userProfileId: userProfile.id });

        await Promise.all(
            currentPhones.map(phone => {
                if (!input.phones.find(item => item.id === phone.id)) {
                    return phoneRepo.delete(phone.id);
                }
            })
        );

        await phoneRepo.save(
            input.phones.map((phone, _, phones) => ({
                ...phone,
                userProfileId: userProfile.id,
                isPrimary: phones.length === 1 ? true : phone.isPrimary
            }))
        );

        /**
         * Emails
         */

        const emailRepo = context.typeorm.getRepository(UserProfileEmail);

        const currentEmails = await emailRepo.find({ userProfileId: userProfile.id });

        await Promise.all(
            currentEmails.map(email => {
                if (!input.emails.find(item => item.id === email.id)) {
                    return emailRepo.delete(email.id);
                }
            })
        );

        await emailRepo.save(
            input.emails.map((email, _, emails) => ({
                ...email,
                userProfileId: userProfile.id,
                isPrimary: emails.length === 1 ? true : email.isPrimary
            }))
        );

        /**
         * Addresses
         */

        const addressRepo = context.typeorm.getRepository(UserProfileAddress);

        const currentAddresses = await addressRepo.find({ userProfileId: userProfile.id });

        await Promise.all(
            currentAddresses.map(address => {
                if (!input.addresses.find(item => item.id === address.id)) {
                    return addressRepo.delete(address.id);
                }
            })
        );

        await addressRepo.save(
            input.addresses.map((address, _, addresses) => ({
                ...address,
                userProfileId: userProfile.id,
                isPrimary: addresses.length === 1 ? true : address.isPrimary
            }))
        );

        return repo.findOne(userProfile.id);
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => String)
    async uploadProfilePic(
        @Ctx() context: GraphQLContext,
        @Arg('image', () => GraphQLUpload) image: Upload
    ): Promise<string> {
        const client = new StorageClient();

        const [storageResult] = await client.uploadUserPhotos([image]).catch(err => {
            throw new Error(err.message);
        });

        return storageResult as string;
    }

    @PermissionLock(PermissionAccessType.ADMIN_USER_MANAGEMENT, PermissionAccessLevel.READ)
    @Query(type => [UserProfile])
    async searchUserProfilesOnFund(
        @Ctx() { typeorm }: GraphQLContext,
        @Arg('fundId', () => String) fundId: string,
        @Arg('search') search: string
    ): Promise<UserProfile[]> {
        const repo = typeorm.getRepository(UserProfile);
        const query = this.createQuery(repo, undefined, undefined, undefined, undefined, search)
            .leftJoinAndSelect('entity.fundUserProfiles', 'fundUserProfiles')
            .leftJoinAndSelect('fundUserProfiles.fund', 'fund')
            .leftJoinAndSelect('fundUserProfiles.fundRole', 'fundRole')
            .leftJoinAndSelect('fund.createdByUserProfile', 'createdByUserProfile')
            .andWhere('fund.id = :fundId', { fundId });

        const result = await query.getMany();

        return result;
    }

    @Query(type => Boolean)
    async changePasswordEvent(@Ctx() context: GraphQLContext): Promise<boolean> {
        const results = await context.email.sendChangePasswordNotification(
            context.typeorm.manager,
            context.user.email
        );
        if (results) return true;
        else return false;
    }
    
    /**
     * Get User Notifications
     * @param context
     * @param GraphQLContext
     */
    @Query(type => [UserProfileNotification])
    async userProfileNotifications(
        @Ctx() context: GraphQLContext,
        @Arg('fundId', type => String, { nullable: false }) fundId: string
    ) {
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const repository = context.typeorm.manager.getRepository(UserProfileNotification);
        const fundRepo = context.typeorm.manager.getRepository(Fund);

        const fund = await fundRepo.findOne({
            where: {
                id: fundId
            }
        });

        return repository
            .createQueryBuilder('userProfileNotifications')
            .leftJoin('userProfileNotifications.userProfile', 'userProfile')
            .leftJoin('userProfileNotifications.notification', 'notification')
            .leftJoin('userProfileNotifications.fund', 'fund')
            .where(':userProfileId IN (userProfile.id)', { userProfileId: profile.id })
            .andWhere('fund_id = :fund_id', { fund_id: fund.id })
            .orderBy('notification.name', 'ASC')
            .getMany();
    }

    @Query(type => [Notification])
    async all(@Ctx() context: GraphQLContext) {
        const repository = context.typeorm.manager.getRepository(Notification);
        return repository.find();
    }

    @Mutation(type => UserProfileNotification)
    async toggleUserProfileNotification(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: ToggleUserProfileNotificationInput
    ): Promise<UserProfileNotification> {
        const userProfileNotificationRepo = context.typeorm.manager.getRepository(
            UserProfileNotification
        );
        
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        const notificationRepo = context.typeorm.manager.getRepository(Notification);
        let userProfileNotification: UserProfileNotification;

        /* When value is not null, it is "forced". i.e. to support toggling on/off
           all notifications.
            When Notification setting exists, update (negate current value) */
        userProfileNotification = await userProfileNotificationRepo.findOne({
            id: input.id,
            userProfileId: profile.id,
            fundId: input.fundId
        });

        // Notification setting exist
        if (input.id && userProfileNotification) {
            // force value for multi on/off state or negate current value for individual toggles
            const newValue =
                input.value === undefined ? !userProfileNotification.enabled : input.value;

            userProfileNotification = {
                ...userProfileNotification,
                enabled: newValue
            };
        } else {
            // Notification setting doesn't exist for this user & fund, create one
            const val = input ? (input.value === undefined ? true : input.value) : true;
            const notification = await notificationRepo.findOne({
                where: {
                    notificationType: input.notificationType
                }
            });
            userProfileNotification = await userProfileNotificationRepo.create({
                userProfileId: profile.id,
                enabled: val,
                notificationId: notification.id,
                fundId: input.fundId
            });
        }

        await userProfileNotificationRepo.save(userProfileNotification);
        return userProfileNotification;
    }

    @Mutation(type => Boolean)
    async profileSettingsChangeEvent(
        @Ctx() context: GraphQLContext
    ): Promise<boolean> {
        // if we've not had an event for 10 mins send an email
        const userProfileEventRepo = context.typeorm.manager.getRepository(UserProfileEvent);
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        const userProfileId = profile.id;

        const lastUserProfileEvent = await userProfileEventRepo
            .createQueryBuilder('userProfileEvent')
            .where('userProfileEvent.userProfileId = :userProfileId', {
                userProfileId: userProfileId
            })
            .limit(1)
            .getOne();

        // hold the promise here, to know if we saved an event
        let eventSavedP;

        // if we have a previous one, if older than 10 mins, then just update it
        if (lastUserProfileEvent) {
            // time in mins since last email
            const timeLapsedSinceLastEmail =
                (new Date().getTime() - lastUserProfileEvent.updatedOn.getTime()) / 1000 / 60;

            // how long to wait before sending another email about changes to settings
            const SETTINGS_UPDATED_SEND_EMAIL_TIMEOUT_MINS = 10;
            if (timeLapsedSinceLastEmail > SETTINGS_UPDATED_SEND_EMAIL_TIMEOUT_MINS) {
                lastUserProfileEvent.updatedOn = new Date();
                lastUserProfileEvent.updatedBy = userProfileId;
                eventSavedP = userProfileEventRepo.save(lastUserProfileEvent);
            }
        } else {
            eventSavedP = userProfileEventRepo.save(
                userProfileEventRepo.create({
                    name: UserProfileEventNameValue.NOTIFICATION,
                    userProfileId: userProfileId,
                    createdBy: userProfileId,
                    updatedBy: userProfileId
                })
            );
        }

        // if event was updated (i.e. promise was created), then send email
        if (eventSavedP) {
            await eventSavedP;
            
            const email = await context.typeorm.manager.getRepository(UserProfileEmail)
                .findOne({ userProfileId: userProfileId, isPrimary: true });

            if (email) {
                const results = await context.email.sendChangeProfileSettingsNotification(
                    context.typeorm.manager,
                    email.value
                );
                if (results) { 
                    return true;
                } else {
                    console.error(`profileSettingsChangeEvent: Unable to send email for donor ${profile.userCode}, email ${email.value}`);
                    return false;
                }
            } else {
                console.error(`profileSettingsChangeEvent: Unable to find primary email for donor ${profile.userCode}`);
                return false;
            }
        }
        return true;
    }

}
