import { GraphQLUpload } from 'graphql-upload';
import _ from 'lodash';
import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import { NotificationType } from '../../src/models/Notification';
import { AccountingFacade } from '../accounting';
import { GraphQLContext } from '../context';
import { updateInstitutionAccountHoldings } from '../cron/accounting/updateHoldings';
import { PermissionLock } from '../decorators/permissionDecorator';
import AccountAlreadyExistsError from '../errors/AccountAlreadyExists';
import CouldNotCreateAdminError from '../errors/CouldNotCreateAdmin';
import InvalidEmailError from '../errors/InvalidEmail';
import NotPermittedError from '../errors/NotPermitted';
import { AddPendingUserToFundInput } from '../inputs/Fund/AddPendingUserToFundInput';
import { AddUserToFundInput } from '../inputs/Fund/AddUserToFundInput';
import { CreateFundInput } from '../inputs/Fund/CreateFundInput';
import { FundFilter } from '../inputs/Fund/FundFilter';
import { FundOrderBy } from '../inputs/Fund/FundOrderBy';
import { UpdateFundInformationInput } from '../inputs/Fund/UpdateFundInformationInput';
import { CreateFundInvestmentForInstitutionAccountInput } from '../inputs/FundInvestment/CreateFundInvestmentForInstitutionAccountInput';
import { CreateFundContributionInput } from '../inputs/FundTransaction/CreateFundContributionInput';
import { CreateGrantRecommendationInput } from '../inputs/FundTransaction/CreateGrantRecommendationInput';
import { AdvisorIMAInput } from '../inputs/IMA/AdvisorIMAInput';
import { InvestmentInput } from '../inputs/Investment/InvestmentInput';
import { NewFundUserProfilePayload } from '../inputs/UserProfile/NewFundUserProfilePayload';
import {
    AppUser,
    Fund,
    FundContact,
    FundContactAddress,
    FundContactEmail,
    FundContactPhone,
    FundInvestment,
    FundRelationship,
    FundResults,
    FundRole,
    FundTransaction,
    FundType,
    FundUserProfile,
    GLAccountReconciliation,
    InstitutionAccount,
    Investment,
    Invitation,
    Notification,
    PendingFundUser,
    Role,
    TransactionType,
    UserProfile,
    UserProfileAccount,
    UserProfileAddress,
    UserProfileEmail,
    UserProfileNotification
} from '../models';
import { FundPermissionAccessLevel, FundPermissionAccessType } from '../models/FundPermission';
import { FundRoleNameValues } from '../models/FundRole';
import { InvestmentType } from '../models/Investment';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { TransactionTypeValue } from '../models/TransactionType';
import { EmailService } from '../sendgrid';
import StorageClient from '../storage/client';
import { Upload } from '../types/uploadType';
import { assignVisualizationColor } from '../utilities/assignVisualizationColor';
import { createContribution } from '../utilities/createContribution';
import { createGrant } from '../utilities/createGrant';
import { getFundCode } from '../utilities/getFundCode';
import { getFundKey } from '../utilities/getFundKey';
import {
    largeIdentify,
    segmentClient,
    SegmentEvent,
    trackDivestmentInstructionsUpdated,
    trackInvestmentInstructionsUpdated,
    trackUserAddAccountHolder
} from '../utilities/segmentConfig';
import { validEmailRegex } from '../utilities/validation';
import { UtilityResolver } from './core/UtilityResolver';
import { shouldSendNotification } from '../utilities/email';

@Resolver(type => Fund)
export class FundResolver extends UtilityResolver {
    /**
     * Get User Funds
     * @param context
     * @param GraphQLContext
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [Fund])
    async userFunds(@Ctx() context: GraphQLContext) {
        // Get current user
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        // Get user funds
        const repository = context.typeorm.manager.getRepository(Fund);

        return await repository
            .createQueryBuilder('fund')
            .innerJoin('fund.fundUserProfiles', 'fundUserProfiles')
            .innerJoin('fundUserProfiles.fundRole', 'fundRole')
            .where('fundUserProfiles.userProfileId = :userProfileId', {
                userProfileId: profile.id
            })
            .andWhere('fundRole.name != :noAccess', { noAccess: FundRoleNameValues.NO_ACCESS })
            .orderBy('fund.createdOn', 'ASC')
            .getMany();
    }

    /**
     * Get User Funds
     * @param context
     * @param GraphQLContext
     */
    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.READ)
    @Query(type => FundResults)
    public async adminFunds(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: FundOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundFilter, { nullable: true })
        where?: FundFilter,
        @Arg('search', type => String, { nullable: true }) search?: string,
        @Arg('excludeCount', type => Boolean, { nullable: true }) excludeCount?: boolean
    ): Promise<FundResults> {
        const repo = context.typeorm.manager.getRepository(Fund);

        let dataQuery: SelectQueryBuilder<Fund>;
        if (search) {
            dataQuery = this.createAdminFundQuery(repo, where, orderBy, skip, take, search);
        } else {
            dataQuery = this.createQuery(repo, where, orderBy, skip, take, search);
        }

        // if excluding count, just return 0 for count value
        let countQuery: SelectQueryBuilder<Fund>;
        if (!excludeCount) {
            if (search) {
                countQuery = this.createAdminFundQuery(repo, where, null, null, null, search);
            } else {
                countQuery = this.createQuery(repo, where, null, null, null, search, false);
            }
        }

        const [data, count, [{ timestamp }]] = await Promise.all([
            dataQuery.getMany(),
            excludeCount ? Promise.resolve(0) : countQuery.getCount(),
            context.typeorm.query('SELECT CURRENT_TIMESTAMP as timestamp')
        ]);

        return {
            timestamp,
            data,
            count
        };
    }

    createAdminFundQuery(
        repo: Repository<Fund>,
        where?: any,
        orderBy?: any,
        skip?: number,
        take?: number,
        search?: string
    ): SelectQueryBuilder<Fund> {
        const builder = repo.createQueryBuilder('fund');

        const relations = repo.metadata.ownRelations;

        const paramNames = [];

        if (skip) builder.skip(skip);

        if (take) builder.take(take);

        if (where) {
            // Iterate thru all property clauses
            for (const propName in where) {
                if (propName === '_customQuery') {
                    const customQuery = where['_customQuery'];

                    if (Array.isArray(customQuery)) {
                        customQuery.forEach(
                            (cQuery: {
                                join?: string;
                                entity?: string;
                                queryString?: string;
                                variableObject?: ObjectLiteral;
                            }) => this.addCustomQuery(cQuery, builder)
                        );
                    } else {
                        this.addCustomQuery(customQuery, builder);
                    }
                } else {
                    // Get property value from where clause
                    const propValue = where[propName];

                    // If simple scalar
                    if (typeof propValue !== 'object') {
                        this.addScalarWhere(builder, `entity.${propName}`, propValue, paramNames);
                        continue;
                    }

                    // If property corresponds to a relation
                    const relation = relations.find(relation => relation.propertyName === propName);

                    if (relation) {
                        this.addRelationWhere(
                            builder,
                            'entity',
                            propName,
                            propValue,
                            paramNames,
                            relation,
                            repo.manager
                        );
                        continue;
                    }

                    // If comparison operator
                    if (typeof propValue === 'object') {
                        this.addComparisonWhere(
                            builder,
                            `entity.${propName}`,
                            propValue,
                            paramNames
                        );
                        continue;
                    }
                }
            }
        }

        if (search) {
            builder.addSelect('levenshtein(:levenshtein, fund.name)', 'rank');
            builder.setParameter('levenshtein', search);
            builder.addOrderBy('rank', 'ASC');
            builder.andWhere(
                'fund.name ILIKE :search OR fund.fundKey ILIKE :search OR fund.fundCode ILIKE :search',
                {
                    search: '%' + search + '%'
                }
            );
        }

        return builder;
    }

    /** Get Fund By Fund Code
     * @param {context} GraphQLContext
     * @param {fundCode} string
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => Fund, { nullable: true })
    async getFundByFundCode(
        @Ctx() context: GraphQLContext,
        @Arg('fundCode') fundCode: string
    ): Promise<Fund | null> {
        // Identify the user making the request
        const user = await this.getCurrentUserProfile(context);

        // Get the requested fund
        const fundRepository = context.typeorm.manager.getRepository(Fund);
        const requestedFund = await fundRepository
            .createQueryBuilder('fund')
            .leftJoinAndSelect('fund.userProfiles', 'userProfiles')
            .leftJoinAndSelect('fund.fundUserProfiles', 'fundUserProfiles')
            .leftJoinAndSelect('fundUserProfiles.userProfile', 'user')
            .leftJoinAndSelect('fundUserProfiles.fundRole', 'fundRole')
            .leftJoinAndSelect('fundRole.fundPermissions', 'fundPermissions')
            .leftJoinAndSelect('fund.investments', 'investments')
            .leftJoinAndSelect('fund.contacts', 'contacts')
            .leftJoinAndSelect('contacts.addresses', 'addresses')
            .where('fund.fundCode = :fundCode', { fundCode: fundCode })
            .getOne();

        if (!requestedFund) return null;

        /**
         * Identify whether the fund belongs to the requesting user
         * or whether the requesting user has the correct permission to view the Fund
         * @todo this will need to work differently for delegated access
         */
        const fundBelongsToUser = requestedFund.createdByUserProfileId === user.id;
        const isAdmin = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel !== PermissionAccessLevel.NONE
        );

        const userCanInvest =
            requestedFund &&
            requestedFund.fundUserProfiles
                ?.find(u => u.userProfileId === user.id)
                ?.fundRole.fundPermissions.find(
                    p => p.accessType === FundPermissionAccessType.INVESTMENT_INSTRUCTIONS
                );

        // Return the fund if either of the conditions is met
        if (
            fundBelongsToUser ||
            isAdmin ||
            userCanInvest.accessLevel !== FundPermissionAccessLevel.NONE
        ) {
            return requestedFund;
        } else {
            throw new NotPermittedError("You don't have sufficient privileges.");
        }
    }

    /** Get Fund By Fund Id
     * @param {context} GraphQLContext
     * @param {fundCode} string
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.READ)
    @Query(type => Fund)
    async getFundByFundId(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string
    ): Promise<Fund> {
        // Get the requested fund
        const fundRepository = context.typeorm.manager.getRepository(Fund);
        const requestedFund = await fundRepository
            .createQueryBuilder('fund')
            .leftJoinAndSelect('fund.investments', 'investments')
            .leftJoinAndSelect('investments.investment', 'investment')
            .leftJoinAndSelect('fund.createdByUserProfile', 'createdByUserProfile')
            .leftJoinAndSelect('fund.fundType', 'fundType')
            .leftJoinAndSelect('fund.fundUserProfiles', 'fundUserProfiles')
            .leftJoinAndSelect('fund.contacts', 'contacts')
            .leftJoinAndSelect('contacts.addresses', 'addresses')
            .where('fund.id = :id', { id: fundId })
            .getOne();

        // Return the fund if the condition is met
        return requestedFund;
    }

    /** Get Fund By Fund Id
     * @param {context} GraphQLContext
     * @param {fundId} string
     * @param {userProfileId} string
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.READ)
    @Query(type => Boolean)
    async doesFundHaveUser(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string,
        @Arg('userProfileId') userProfileId: string
    ): Promise<boolean> {
        const repo = context.typeorm.manager.getRepository(FundUserProfile);

        const fup = await repo.find({
            userProfileId,
            fundId
        });

        if (fup === null || fup.length === 0) {
            return false;
        }

        return true;
    }

    /** Get Fund By Fund Id
     * @param {context} GraphQLContext
     * @param {fundId} string
     */
    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.READ)
    @Query(type => [InstitutionAccount])
    async imaAccountsForFund(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string
    ): Promise<InstitutionAccount[]> {
        return await context.typeorm
            .createQueryBuilder(InstitutionAccount, 'institutionAccount')
            .leftJoin('institutionAccount.investment', 'investment')
            .leftJoin('investment.fundAllocations', 'fundInvestment')
            .where('fundInvestment.fundId = :fundId', { fundId })
            .andWhere('investment.investmentType = :ima', { ima: InvestmentType.IMA })
            .getMany();
    }

    /** Get UserProfiles By Fund Id
     * @param {context} GraphQLContext
     * @param {fundId} string
     * @param {skip} number
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.READ)
    @Query(type => [UserProfile])
    async getAccountHoldersForFund(
        @Ctx() context: GraphQLContext,
        @Arg('fundId', type => String) fundId: string,
        @Arg('skip', type => Int, { nullable: true }) skip?: number
    ): Promise<UserProfile[]> {
        const query = context.typeorm
            .createQueryBuilder(UserProfile, 'userProfile')
            .leftJoinAndSelect('userProfile.fundUserProfiles', 'fundUserProfile')
            .leftJoinAndSelect('fundUserProfile.fundRelationship', 'fundRelationship')
            .where('fundUserProfile.fundId = :fundId', { fundId })
            .orderBy('userProfile.lastName', 'ASC');

        // for this view we fetch in increments of 8
        if (skip) {
            query.take(8).skip(skip);
        }

        return query.getMany();
    }

    /** Get PendingFundUser By Fund Id
     * @param {context} GraphQLContext
     * @param {fundId} string
     * @param {skip} number
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.READ)
    @Query(type => [PendingFundUser])
    async getPendingUsersForFund(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string,
        @Arg('skip', type => Int) skip?: number
    ): Promise<PendingFundUser[]> {
        const query = context.typeorm
            .createQueryBuilder(PendingFundUser, 'pendingFundUser')
            .where('pendingFundUser.fundId = :fundId', { fundId })
            .andWhere('pendingFundUser.enabled = TRUE')
            .take(8)
            .skip(skip)
            .orderBy('pendingFundUser.email', 'ASC');

        return query.getMany();
    }

    /**
     * Create Fund
     * @param GraphQLContext
     * @param CreateFundInput
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Fund)
    async createFund(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateFundInput
    ): Promise<Fund> {
        // Variables
        const manager = context.typeorm.manager;
        // Get Current User
        const { profile, isImpersonated } = await this.getPotentiallyImpersonatedProfile(context);

        const primaryAddress = await manager.findOne(UserProfileAddress, {
            userProfileId: profile.id,
            isPrimary: true
        });
        const addresses = await manager.find(UserProfileAddress, {
            userProfileId: profile.id
        });
        if (!primaryAddress) {
            await manager.save(
                manager.create(UserProfileAddress, {
                    userProfileId: profile.id,
                    lineOne: input.address.address1,
                    lineTwo: input.address.address2,
                    country: 'United States' /* TODO: Get country input from elsewhere post MVP */,
                    city: input.address.city,
                    state: input.address.state,
                    postalCode: input.address.zip,
                    isPrimary: true
                })
            );
        } else {
            const addressExists = addresses.find(address => {
                return (
                    address.lineOne === input.address.address1 &&
                    address.lineTwo === input.address.address2 &&
                    address.city === input.address.city &&
                    address.state === input.address.state &&
                    address.postalCode === input.address.zip
                );
            });

            if (!addressExists) {
                await manager.save(
                    manager.create(UserProfileAddress, {
                        userProfileId: profile.id,
                        lineOne: input.address.address1,
                        lineTwo: input.address.address2,
                        country:
                            'United States' /* TODO: Get country input from elsewhere post MVP */,
                        city: input.address.city,
                        state: input.address.state,
                        postalCode: input.address.zip,
                        isPrimary: false
                    })
                );
            }
        }
        // Generate fund code
        const fundCode = await getFundCode(manager);

        // utility func that generates the next fund key
        const fundKey = await getFundKey(manager, profile);

        let projectId: string; 
        try {
            projectId = await new AccountingFacade().createProject(input.name);
        } catch (error) {
            console.error(`createFund: Unable to create project ID for fund ${input.name}, ${fundKey}: Error - ${error.message}`);
        }

        // Create Fund Object
        const fund = manager.create(Fund, {
            name: input.name,
            fundCode,
            fundKey,
            description: '',
            fundTypeId: input.fundTypeId,
            statementByMail: input.statementByMail,
            statementByPaperless: input.statementByPaperless,
            enabled: true,
            primaryAccountHolderId: profile.id,
            createdBy: profile.id,
            updatedBy: profile.id,
            createdByUserProfileId: profile.id,
            accountingProjectId: projectId
        });

        // Save Fund Object
        const { id: fundId } = await manager.save(fund);

        const fundRole = await manager.findOne(FundRole, { name: FundRoleNameValues.FULL_ACCESS });

        // Create Fund User Profile record
        await manager.save(
            manager.create(FundUserProfile, {
                fundId,
                userProfileId: profile.id,
                fundRoleId: fundRole.id
            })
        );

        // Create Fund Contact Object
        const { id: fundContactId } = await manager.save(
            manager.create(FundContact, {
                fundId: fundId,
                firstName: input.firstName,
                middleName: input.middleName,
                lastName: input.lastName,
                suffix: input.suffix,
                prefix: input.prefix,
                dob: input.dateOfBirth,
                isPrimary: true,
                enabled: true,
                createdBy: profile.id,
                updatedBy: profile.id
            })
        );

        // Create Fund Contact Phone Object
        await manager.save(
            manager.create(FundContactPhone, {
                fundContactId: fundContactId,
                value: input.phone,
                isPrimary: true,
                enabled: true,
                createdBy: profile.id,
                updatedBy: profile.id
            })
        );

        if (input.secondaryPhone) {
            // Create Fund Contact Secondary Phone Object
            await manager.save(
                manager.create(FundContactPhone, {
                    fundContactId: fundContactId,
                    value: input.secondaryPhone,
                    isPrimary: false,
                    enabled: true,
                    createdBy: profile.id,
                    updatedBy: profile.id
                })
            );
        }

        // Create Fund Contact Email Object
        await manager.save(
            manager.create(FundContactEmail, {
                fundContactId: fundContactId,
                value: input.email,
                isPrimary: true,
                enabled: true,
                createdBy: profile.id,
                updatedBy: profile.id
            })
        );

        if (input.secondaryEmail) {
            // Create Fund Contact Secondary Email Object
            await manager.save(
                manager.create(FundContactEmail, {
                    fundContactId: fundContactId,
                    value: input.secondaryEmail,
                    isPrimary: false,
                    enabled: true,
                    createdBy: profile.id,
                    updatedBy: profile.id
                })
            );
        }

        // Create Fund Contact Address Object
        await manager.save(
            manager.create(FundContactAddress, {
                fundContactId: fundContactId,
                lineOne: input.address.address1,
                lineTwo: input.address.address2,
                city: input.address.city,
                state: input.address.state,
                postalCode: input.address.zip,
                country: 'United States',
                isPrimary: true,
                enabled: true,
                createdBy: profile.id,
                updatedBy: profile.id
            })
        );

        if (input.secondaryAddress) {
            // Create Fund Contact Address Object
            await manager.save(
                manager.create(FundContactAddress, {
                    fundContactId: fundContactId,
                    lineOne: input.secondaryAddress.address1,
                    lineTwo: input.secondaryAddress.address2,
                    city: input.secondaryAddress.city,
                    state: input.secondaryAddress.state,
                    postalCode: input.secondaryAddress.zip,
                    country: 'United States',
                    isPrimary: true,
                    enabled: true,
                    createdBy: profile.id,
                    updatedBy: profile.id
                })
            );
        }

        // Set Allocations for Fund
        let allocations: FundInvestment[];
        if (input.investments) {
            allocations = input.investments.map(a =>
                manager.create(FundInvestment, {
                    fundId: fund.id,
                    createdBy: profile.id,
                    updatedBy: profile.id,
                    ...a
                })
            );
        } else {
            const defaults = await manager
                .getRepository(Investment)
                .createQueryBuilder('investment')
                .where('investment.investmentType IN (:...investmentTypes)', {
                    investmentTypes: [
                        InvestmentType.POOL,
                        InvestmentType.GRANT_CASH,
                        InvestmentType.CONTRIBUTION_CASH,
                        InvestmentType.SHARED_STOCK
                    ]
                })
                .getMany();
            allocations = defaults.map(d =>
                manager.create(FundInvestment, {
                    fundId: fund.id,
                    createdBy: profile.id,
                    updatedBy: profile.id,
                    allocationPercentage: d.defaultAllocationPercentage,
                    divestmentPercentage: d.defaultDivestmentPercentage,
                    investmentId: d.id
                })
            );
        }

        // Save Fund Investments
        await manager.save(allocations);

        const fundCount = await manager
            .getRepository(Fund)
            .createQueryBuilder('fund')
            .leftJoin('fund.userProfiles', 'userProfile')
            .where('userProfile.id = :id', { id: profile.id })
            .getCount();

        if (!isImpersonated) {
            largeIdentify(manager, profile.id);

            segmentClient.track({
                userId: profile.id,
                event: SegmentEvent.FUND_ADDED,
                properties: {
                    fund_name: fund.name,
                    fund_id: fund.fundCode
                }
            });
        }

        // send email notification
        const sendNotification = await shouldSendNotification(
            manager,
            profile.id,
            NotificationType.FUND_CREATED
        );
        if (sendNotification)
            await context.email.sendNewFundOpenNotification(manager, input.email, fund.name);

        // Return Fund
        return fund;
    }

    @Query(type => [FundType])
    async fundTypes(@Ctx() context: GraphQLContext): Promise<FundType[]> {
        return await context.typeorm.manager.getRepository(FundType).find();
    }

    @Query(type => Fund, { nullable: true })
    async getSimpleFundById(
        @Ctx() context: GraphQLContext,
        @Arg('fundId', { nullable: false }) fundId: string
    ): Promise<Fund | null> {
        const repo = context.typeorm.manager.getRepository(Fund);

        return repo.findOne(fundId);
    }

    @Query(type => Fund, { nullable: true })
    async getSimpleFundByFundCode(
        @Ctx() context: GraphQLContext,
        @Arg('fundCode', { nullable: false }) fundCode: string
    ): Promise<Fund | null> {
        const repo = context.typeorm.manager.getRepository(Fund);

        return repo.findOne({ fundCode });
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => [FundInvestment])
    async updateInvestmentsForFund(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string,
        @Arg('allocations', type => [InvestmentInput])
        allocationsInput: InvestmentInput[]
    ): Promise<FundInvestment[]> {
        const { manager } = context.typeorm;
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);
        // ensure allocation ratios add up to 1
        if (_.sumBy(allocationsInput, a => a.percentage * 100) / 100 !== 1) {
            throw Error('The sum of allocation percentages must be equal to one.');
        }

        const fundRepo = manager.getRepository(Fund);
        const fund = await fundRepo.findOne({ id: fundId });

        trackInvestmentInstructionsUpdated(profile.id, fund.fundCode, fund.name);

        // update fund investments
        return await manager.transaction(async m => {
            const repo = m.getRepository(FundInvestment);

            return Promise.all(
                allocationsInput.map(async allocation => {
                    const fundInvestment = await repo.findOne({
                        fundId,
                        investmentId: allocation.investmentId
                    });

                    fundInvestment.allocationPercentage = allocation.percentage;
                    fundInvestment.updatedBy = profile.id;
                    return m.save(fundInvestment);
                })
            );
        });
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => [FundInvestment])
    async updateDivestmentPercentagesForFund(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string,
        @Arg('divestments', type => [InvestmentInput])
        divestmentsInput: InvestmentInput[]
    ): Promise<FundInvestment[]> {
        const manager = context.typeorm.manager;
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        const fundRepo = manager.getRepository(Fund);
        const fund = await fundRepo.findOne({ id: fundId });

        // ensure allocation ratios add up to 1
        if (_.sumBy(divestmentsInput, a => a.percentage * 100) / 100 !== 1) {
            throw Error('The sum of divestment percentages must be equal to one.');
        }

        // update fund investments

        trackDivestmentInstructionsUpdated(profile.id, fund.fundCode, fund.name);

        return await manager.transaction(async m => {
            const repo = m.getRepository(FundInvestment);

            return Promise.all(
                divestmentsInput.map(async divestment => {
                    const fundInvestment = await repo.findOne({
                        fundId,
                        investmentId: divestment.investmentId
                    });
                    fundInvestment.divestmentPercentage = divestment.percentage;
                    fundInvestment.updatedBy = profile.id;
                    return m.save(fundInvestment);
                })
            );
        });
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => FundTransaction)
    async createGrantRecommendationForFund(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => CreateGrantRecommendationInput) input: CreateGrantRecommendationInput,
        @Arg('recipientId', type => String, { nullable: true }) recipientId?: string
    ): Promise<FundTransaction> {
        // Variables
        const manager = context.typeorm.manager;

        // Get Current User
        const {
            profile: userProfile,
            isImpersonated
        } = await this.getPotentiallyImpersonatedProfile(context);
        const userProfileId = input.grantOnBehalfOfDonorUserProfileId
            ? input.grantOnBehalfOfDonorUserProfileId
            : userProfile.id;

        // Get Fund
        const fund = await manager.findOne(Fund, {
            where: { id: input.fundId },
            relations: ['userProfiles']
        });

        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel === PermissionAccessLevel.FULL
        );

        // Check to make sure user exists on this fund
        if (
            !userIsAuthorized &&
            fund.userProfiles.find(profile => profile.id === userProfile.id) === undefined
        ) {
            throw new NotPermittedError('You are not permitted to perform this action');
        }
        // Get Transaction Types
        const transactionType = await manager.findOne(TransactionType, {
            name: !!input.recurringTiming
                ? TransactionTypeValue.GRANT_SERIES
                : TransactionTypeValue.GRANT
        });

        // reusable function to create the database transactions for creating a grant
        return await createGrant(manager, recipientId, userProfileId, transactionType, input, {
            context,
            createdByAdmin: input.grantOnBehalfOfDonorUserProfileId ? userProfile.id : null,
            isImpersonated
        });
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => FundTransaction)
    async createContributionForFund(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateFundContributionInput
    ): Promise<FundTransaction> {
        const manager = context.typeorm.manager;
        // Get Current User
        const {
            profile: userProfile,
            isImpersonated
        } = await this.getPotentiallyImpersonatedProfile(context);
        // if on behalf of donor user use that id instead
        const userProfileId = input.contributeOnBehalfOfDonorUserProfileId
            ? input.contributeOnBehalfOfDonorUserProfileId
            : userProfile.id;
        // Get userProfileAccount
        const userProfileAccount = await manager.findOne(UserProfileAccount, {
            id: input.userProfileAccountId
        });

        // Get Fund
        const fund = await manager.findOne(Fund, {
            where: { id: input.fundId },
            relations: ['userProfiles']
        });

        const userIsAuthorized = (await this.getPermissionList(context)).some(
            permission =>
                permission.accessType === PermissionAccessType.ADMIN_FUNDS &&
                permission.accessLevel === PermissionAccessLevel.FULL
        );
        // Get Transaction Types
        const transactionType = await manager.findOne(TransactionType, {
            name: !!input.recurringTiming
                ? TransactionTypeValue.CONTRIBUTION_SERIES
                : TransactionTypeValue.CONTRIBUTION
        });

        if (
            !userIsAuthorized &&
            (userProfileAccount.userProfileId != userProfile.id ||
                fund.userProfiles.find(profile => profile.id === userProfile.id) === undefined)
        ) {
            throw new NotPermittedError('You are not permitted to perform this action');
        }

        console.log('fund.resolver : ----Create Contribution Start---');
        console.log('fund.resolver : Fund : ' + JSON.stringify(fund));
        console.log('fund.resolver : Transaction Type : ' + JSON.stringify(transactionType));
        return createContribution(
            manager,
            userProfileId,
            userProfileAccount.id,
            transactionType.id,
            input,
            { isImpersonated }
        );
    }

    @Mutation(type => Fund)
    public async addIndividuallyManagedAccountToFund(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateFundInvestmentForInstitutionAccountInput
    ) {
        const instAccountRepo = context.typeorm.getRepository(InstitutionAccount);
        const investmentRepo = context.typeorm.getRepository(Investment);
        const fundInvestmentRepo = context.typeorm.getRepository(FundInvestment);

        const fund = await context.typeorm
            .createQueryBuilder(Fund, 'fund')
            .leftJoinAndSelect('fund.investments', 'fundInvestment')
            .leftJoinAndSelect('fund.fundUserProfiles', 'fundUserProfiles')
            .leftJoinAndSelect('fundUserProfiles.fundRole', 'fundRole')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .leftJoinAndSelect('investment.institutionAccount', 'institutionAccount')
            .leftJoinAndSelect('investment.fundAllocations', 'fundAllocations')
            .where('fund.id = :id', { id: input.fundId })
            .getOne();

        const instAccount = await instAccountRepo
            .createQueryBuilder('instAcct')
            .leftJoinAndSelect('instAcct.investment', 'investment')
            .leftJoinAndSelect('investment.fundAllocations', 'fundAllocations')
            .where('instAcct.id = :id', { id: input.institutionAccountId })
            .getOne();

        const hasAllocations = (instAccount.investment?.fundAllocations || []).length > 0;

        // Prevent the user from adding an account that has already been linked to a fund
        if (hasAllocations && input.override != true) {
            throw new Error('This institution account already exists on a fund');
        }

        const glAccountReconciliationRepo = context.typeorm.getRepository(GLAccountReconciliation);

        const glAccountRecon = await glAccountReconciliationRepo
            .createQueryBuilder('glar')
            .leftJoin('glar.glAccount', 'gla')
            .where('gla.id = :id', { id: instAccount.glAccountId })
            .getOne();

        if (!glAccountRecon && instAccount.glAccountId) {
            await glAccountReconciliationRepo.save(
                glAccountReconciliationRepo.create({
                    glAccountId: instAccount.glAccountId,
                    balanceOpen: instAccount.marketValue,
                    datePreviousReconciled: new Date()
                })
            );
        }

        let investment = await investmentRepo.findOne({ institutionAccountId: instAccount.id });
        if (!investment) {
            investment = await investmentRepo.save(
                investmentRepo.create({
                    name: instAccount.displayName,
                    institutionAccountId: instAccount.id,
                    glAccountId: instAccount.glAccountId,
                    investmentType: InvestmentType.IMA,
                    defaultAllocationPercentage: 0,
                    defaultDivestmentPercentage: 0,
                    orderNum: -1,
                    marketValue: instAccount.marketValue,
                    marketValueAsOf: instAccount.lastUpdated,
                    visualizationColor: await assignVisualizationColor(
                        context.typeorm.manager,
                        fund
                    )
                })
            );
        }

        // if fundAllocations exist update fundId otherwise create new one
        if (hasAllocations) {
            await fundInvestmentRepo.update(instAccount.investment.fundAllocations[0].id, {
                fundId: input.fundId
            });
        } else {
            await fundInvestmentRepo.save({
                fundId: fund.id,
                allocationPercentage: 0,
                divestmentPercentage: 0,
                investmentId: investment.id
            });
        }

        updateInstitutionAccountHoldings(instAccount.id);

        if (process.env.NODE_ENV !== 'development') {
            const emailService = context?.email || new EmailService();
            await emailService.sendIMASuccessfullyLinkedEmails(
                context.typeorm.manager,
                instAccount,
                fund
            );
        }

        return fund;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean)
    async sendIMARequestNotification(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: AdvisorIMAInput
    ): Promise<boolean> {
        // Variables
        const manager = context.typeorm.manager;
        const { profile } = await this.getPotentiallyImpersonatedProfile(context);

        // if (process.env.NODE_ENV !== 'development') {
        return await context.email
            .sendIMARequestNotification(manager, input, `${profile.firstName} ${profile.lastName}`)
            .catch(() => false)
            .then(() => true);
        // }
    }

    updateUserProfileNotification = async (userProfileId, fundId, context, manager) => {
        const userNotificationRepo = context.typeorm.getRepository(UserProfileNotification);
        // get all notification types
        const notifications: Notification[] = await manager.find(Notification);

        // get all user notifications for a fund
        const userProfileNotifications: UserProfileNotification[] = await userNotificationRepo.find(
            {
                fundId,
                userProfileId
            }
        );

        // for each notification, check if the user already has it
        // for the fund, update to ON or create a new ON setting.
        notifications.map(async notification => {
            const notificationRecord = userProfileNotifications.find(
                n => n.notificationId === notification.id
            );

            // notification already exists for this user & fund, update to enabled
            // this happens if a user was added to a fund, then removed and re-added.
            if (notificationRecord) {
                await userNotificationRepo.save({
                    id: notificationRecord.id,
                    enabled: true
                });
            } else {
                // create a new record
                await userNotificationRepo.save({
                    userProfileId,
                    fundId,
                    notificationId: notification.id,
                    enabled: true
                });
            }
        });
    };

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Fund)
    public async addUserToFund(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: AddUserToFundInput
    ): Promise<Fund> {
        const { isImpersonated, profile } = await this.getPotentiallyImpersonatedProfile(context);

        const manager = context.typeorm.manager;
        const fundRepo = context.typeorm.getRepository(Fund);
        const fundUserProfileRepo = context.typeorm.getRepository(FundUserProfile);
        const fundUserProfile = await fundUserProfileRepo.save({
            fundId: input.fundId,
            userProfileId: input.userProfileId,
            fundRoleId: input.fundRoleId,
            fundRelationshipId: input.fundRelationshipId
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

        const userProfile = await manager.findOne(UserProfile, {
            id: fundUserProfile.userProfileId
        });

        const user = await manager.findOne(AppUser, {
            id: userProfile.appUserId
        });

        const fundUserProfiles = await manager.find(FundUserProfile, {
            fundId: fund.id
        });

        await this.updateUserProfileNotification(userProfile.id, fund.id, context, manager);

        await Promise.all(
            fundUserProfiles.map(async fundUserProf => {
                if (fundUserProf.id === fundUserProfile.id) return;
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

                return Promise.resolve(appUser);
            })
        );

        if (!isImpersonated) {
            largeIdentify(manager, profile.id);
            trackUserAddAccountHolder(profile.id, fund.fundCode, fund.name);
        }

        return await fundRepo.findOne(input.fundId, {
            relations: ['fundUserProfiles', 'fundUserProfiles.fundRole']
        });
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Fund)
    public async addPendingUserToFund(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: AddPendingUserToFundInput
    ): Promise<Fund> {
        const manager = context.typeorm.manager;
        const { profile, isImpersonated } = await this.getPotentiallyImpersonatedProfile(context);
        const fundRepo = context.typeorm.getRepository(Fund);
        const role = await manager.findOne(Role, {
            name: 'Donor'
        });
        const roleNewUser = await manager.findOne(FundRole, {
            id: input.fundRoleId
        });
        const fundRelationship = await manager.findOne(FundRelationship, {
            id: input.fundRelationshipId
        });
        const fund = await fundRepo.findOne(input.fundId, {
            relations: ['fundType']
        });
        const pendingFundUserRepo = context.typeorm.getRepository(PendingFundUser);
        const sendNotification = await shouldSendNotification(
            manager,
            profile.id,
            NotificationType.FUND_ROLE_ADDED_REMOVED,
            input.fundId
        );
        if (sendNotification) {
            await context.email.sendNewFundUserAlertToFundHolders(
                manager,
                '',
                input.email,
                roleNewUser.name,
                fundRelationship.name,
                fund.name
            );
        }
        const pendingFundUser = await pendingFundUserRepo.save({
            fundId: input.fundId,
            email: input.email,
            fundRoleId: input.fundRoleId,
            fundRelationshipId: input.fundRelationshipId
        });

        await this.inviteUserToFund(context, {
            email: input.email,
            roleId: role.id,
            pendingFundUserId: pendingFundUser.id,
            fundName: fund.name,
            fundType: fund.fundType.description
        });

        if (!isImpersonated) {
            largeIdentify(context.typeorm.manager, profile.id);
            trackUserAddAccountHolder(profile.id, fund.fundCode, fund.name);
        }

        return fund;
    }

    protected async inviteUserToFund(
        context: GraphQLContext,
        user: NewFundUserProfilePayload
    ): Promise<Invitation> {
        const manager = context.typeorm.manager;
        const errors = [];
        const email = user.email;
        const invalidEmail = !validEmailRegex.test(email);

        if (invalidEmail) {
            errors.push(new InvalidEmailError(email));
        }

        //  get current profile
        const profile = await this.getCurrentUserProfile(context);

        const existing = await manager.findOne(UserProfileEmail, {
            value: email
        });

        const pendingFundUser = await manager.findOne(PendingFundUser, {
            id: user.pendingFundUserId
        });

        const fund = await manager.findOne(Fund, {
            id: pendingFundUser.fundId
        });

        const fundType = await manager.findOne(FundType, {
            id: fund.fundTypeId
        });

        if (!!existing) {
            errors.push(new AccountAlreadyExistsError(email));
        }

        if (errors.length > 0) {
            throw new CouldNotCreateAdminError(errors);
        }

        const role = await manager.findOne(Role, user.roleId);

        const invitationRecord = manager.create(Invitation, {
            roleId: role.id,
            email: user.email,
            createdBy: profile.id,
            updatedBy: profile.id,
            pendingFundUserId: user.pendingFundUserId
        });

        const invitation = await manager.save(invitationRecord);

        await context.email.sendFundInvitationEmails(
            manager,
            invitation.code,
            user.email,
            fund.name,
            fundType.description
        );

        return invitation;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Fund)
    public async updateFundInformation(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateFundInformationInput
    ): Promise<Fund> {
        const manager = context.typeorm.manager;
        // Get Current User
        const { profile, isImpersonated } = await this.getPotentiallyImpersonatedProfile(context);

        const fund = await manager.findOne(Fund, {
            id: input.fundId
        });

        const primaryContact = await manager.findOne(FundContact, {
            fundId: input.fundId,
            isPrimary: true
        });

        const primaryAddress = await manager.findOne(FundContactAddress, {
            fundContactId: primaryContact.id,
            isPrimary: true
        });

        const fundType = await manager.findOne(FundType, {
            name: input.fundType
        });

        if (fund.primaryAccountHolderId !== input.primaryAccountHolderId) {
            fund.primaryAccountHolderId = input.primaryAccountHolderId;
        }

        if (fund.name !== input.fundName) {
            fund.name = input.fundName;
        }

        if (!!input.fundPhoto && fund.fundPhoto !== input.fundPhoto) {
            fund.fundPhoto = input.fundPhoto;
        }

        if (!!input.mission && fund.description !== input.mission) {
            fund.description = input.mission;
        }
        if (input.fundType && fund.fundTypeId !== fundType.id) {
            fund.fundTypeId = fundType.id;
        }
        if (input.fundAddress) {
            primaryAddress.lineOne = input.fundAddress.address1;
            if (input.fundAddress.address2) {
                primaryAddress.lineTwo = input.fundAddress.address2;
            }
            primaryAddress.city = input.fundAddress.city;
            primaryAddress.state = input.fundAddress.state;
            primaryAddress.postalCode = input.fundAddress.zip;
        }
        fund.divestmentFallback = input.divestmentFallback;

        await manager.save(fund);
        await manager.save(primaryAddress);

        const sendNotification = await shouldSendNotification(
            manager,
            input.primaryAccountHolderId,
            NotificationType.FUND_EDITED,
            input.fundId
        );
        if (sendNotification) {
            const userProfileEmail = await manager.findOne(UserProfileEmail, {
                isPrimary: true,
                userProfileId: input.primaryAccountHolderId
            });
            await context.email.sendChangeProfileSettingsNotification(
                manager,
                userProfileEmail.value
            );
        }

        return fund;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean)
    async dismissFundRecurringReminder(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string
    ): Promise<boolean> {
        const { manager } = context.typeorm;

        await manager
            .createQueryBuilder()
            .update(Fund)
            .set({
                recurringContributionsDismissed: true
            })
            .where('id = :fundId', { fundId })
            .execute();

        return true;
    }

    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.FULL)
    @Mutation(type => String)
    async uploadFundPic(
        @Ctx() context: GraphQLContext,
        @Arg('image', () => GraphQLUpload) image: Upload
    ): Promise<string> {
        const client = new StorageClient();

        const [storageResult] = await client.uploadFundPhotos([image]).catch(err => {
            throw new Error(err.message);
        });

        return storageResult as string;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean)
    public async editFundUser(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string,
        @Arg('userProfileId') userProfileId: string,
        @Arg('roleId') roleId: string,
        @Arg('relationshipId') relationshipId: string
    ): Promise<boolean> {
        await context.typeorm.manager
            .createQueryBuilder()
            .update(FundUserProfile)
            .set({ fundRoleId: roleId, fundRelationshipId: relationshipId })
            .where('fundId = :fundId', { fundId })
            .andWhere('userProfileId = :userProfileId', { userProfileId })
            .execute();

        return true;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean)
    public async removeFundUser(
        @Ctx() context: GraphQLContext,
        @Arg('fundId') fundId: string,
        @Arg('userId') userId: string,
        @Arg('isPending') isPending: boolean
    ): Promise<boolean> {
        if (isPending) {
            // delete invitation
            await context.typeorm.manager
                .createQueryBuilder()
                .delete()
                .from(Invitation)
                .where({ pendingFundUserId: userId })
                .execute();
            // delete pending user record
            await context.typeorm.manager
                .createQueryBuilder()
                .delete()
                .from(PendingFundUser)
                .where('fundId = :fundId', { fundId })
                .andWhere('id = :userId', { userId })
                .execute();
        } else {
            await context.typeorm.manager
                .createQueryBuilder()
                .delete()
                .from(FundUserProfile)
                .where({ fundId, userProfileId: userId })
                .execute();
        }

        return true;
    }
}
