import { RecipientEventNameValues } from './../models/RecipientEvent';
import { GraphQLUpload } from 'graphql-upload';
import { Resolver, Mutation, Ctx, Arg, Query, registerEnumType, Int } from 'type-graphql';
import dayjs from 'dayjs';

import {
    Recipient,
    RecipientContact,
    RecipientContactAddress,
    RecipientContactPhone,
    RecipientStatus,
    RecipientBoardOfDirectorsMember,
    RecipientCause,
    RecipientSearchResult,
    Cause,
    RecipientContactEmail,
    Tenant,
    Tag,
    RecipientTag,
    RecipientEvent,
    RecipientPreferredPayment
} from '../models';
import formatCharityName from '../utilities/formatCharityName';
import { getRecipientCode } from '../utilities/getRecipientCode';
import { getCauseByCode } from '../utilities/getCauseByCode';
import { UtilityResolver } from './core/UtilityResolver';
import GuidestarClient, { GuideStarGetCharityDataResponse } from '../guidestar/client';
import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import { CreateGrantRecipientInput } from '../inputs/Recipient/CreateGrantRecipientInput';
import { RecipientOrderBy } from '../inputs/Recipient/RecipientOrderBy';
import { RecipientContactInput } from '../inputs/RecipientContact/RecipientContactInput';
import { RecipientResults } from '../models/RecipientResults';
import { EntityManager, SelectQueryBuilder, Brackets, Repository, ObjectLiteral } from 'typeorm';
import { CharityOrderBy } from '../inputs/Charities/CharityOrderBy';
import { CharityFilter, CharityFilterTag } from '../inputs/Charities/CharityFilter';
import { UpdateRecipientInput } from '../inputs/Recipient/UpdateRecipientInput';
import { GuideStarSeal, PaymentTypeValue } from '../models/Recipient';
import { RecipientStatusName } from '../models/RecipientStatus';
import StorageClient from '../storage/client';
import { PermissionAccessType, PermissionAccessLevel } from '../models/Permission';
import { Upload } from '../types/uploadType';
import { CreateRecipientPreferredPaymentInput } from '../inputs/Recipient/CreateRecipientPreferredPaymentInput';

export enum CuratedCategory {
    'favorites',
    'initiatives',
    'popular',
    'new'
}

registerEnumType(CuratedCategory, {
    name: 'CuratedCategory'
});

@Resolver(type => Recipient)
export class RecipientResolver extends UtilityResolver {
    /**
     * Search Recipients
     * @param context
     * @param recipientName
     */
    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [RecipientSearchResult])
    async searchRecipients(
        @Ctx() context: GraphQLContext,
        @Arg('recipientName') recipientName: string
    ): Promise<RecipientSearchResult[]> {
        const search = this.getTSQuery(recipientName);

        const manager = context.typeorm.manager;

        const approvedStatus = await context.typeorm.manager.findOne(RecipientStatus, {
            name: RecipientStatusName.APPROVED
        });

        const query = manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.contact', 'contact')
            .leftJoinAndSelect('contact.primaryPhone', 'primaryPhone')
            .leftJoinAndSelect('contact.primaryAddress', 'primaryAddress')
            .leftJoinAndSelect('contact.primaryEmail', 'primaryEmail')
            .leftJoinAndSelect('recipient.recipientCauses', 'recipientCauses')
            .leftJoinAndSelect('recipientCauses.cause', 'cause')
            .addSelect(`ts_rank_cd(recipient.search_vector, '${search}', 1)`, 'rank')
            .where(`recipient.search_vector @@ to_tsquery('simple', '${search}')`)
            .andWhere('recipient.recipientStatusId = :id', { id: approvedStatus.id })
            .orderBy('rank', 'DESC')
            .addOrderBy('recipient.name', 'ASC')
            .limit(5);

        const findPrimaryCause = (recipientCauses: RecipientCause[] | null): string => {
            if (recipientCauses === null || recipientCauses.length === 0) {
                return null;
            }

            for (const recipientCause of recipientCauses) {
                if (recipientCause.isPrimary) {
                    return recipientCause.cause.name;
                }
            }

            return null;
        };

        return query.getMany().then(
            async recipients =>
                await Promise.all(
                    recipients.map(async recipient => {
                        const recipientStatus = await manager.findOne(RecipientStatus, {
                            id: recipient.recipientStatusId
                        });
                        return {
                            id: recipient.id,
                            recipientCode: recipient.recipientCode,
                            name: recipient.name,
                            ein: recipient.ein,
                            contactName: recipient.contact.orgContactName,
                            addressLineOne: recipient.contact.primaryAddress.lineOne,
                            addressLineTwo: recipient.contact.primaryAddress.lineTwo,
                            city: recipient.contact.primaryAddress.city,
                            state: recipient.contact.primaryAddress.state,
                            zip: recipient.contact.primaryAddress.postalCode,
                            phone: recipient.contact.primaryPhone.value,
                            website: recipient.website,
                            npoStatus: recipient.npoStatus,
                            pub78: recipient.pub78,
                            ofac: recipient.ofac,
                            recipientStatus: recipientStatus.name,
                            primaryCause: findPrimaryCause(recipient.recipientCauses)
                        };
                    })
                )
        );
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => RecipientResults)
    async getCharities(
        @Ctx() context: GraphQLContext,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('search', { nullable: true }) search?: string,
        @Arg('filter', { nullable: true }) filter?: CharityFilter,
        @Arg('orderBy', { nullable: true }) orderBy?: CharityOrderBy
    ): Promise<RecipientResults> {
        const { manager } = context.typeorm;

        if (search) search = this.getTSQuery(search);

        const approvedStatus = await manager.findOne(RecipientStatus, {
            name: RecipientStatusName.APPROVED
        });

        const query = manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoin('recipient.fundDestinations', 'fundDestinations')
            .leftJoinAndSelect('recipient.tags', 'tags')
            .leftJoinAndSelect('recipient.causes', 'causes')
            .leftJoinAndSelect('recipient.contact', 'contact')
            .leftJoinAndSelect('recipient.recipientStatus', 'status')
            .leftJoinAndSelect('contact.primaryAddress', 'address')
            .addSelect(search ? `ts_rank_cd(recipient.search_vector, '${search}', 1)` : '1', 'rank')
            .addSelect('count("fundDestinations")', 'popularity')
            .groupBy('recipient.id')
            .addGroupBy('tags.id')
            .addGroupBy('causes.id')
            .addGroupBy('contact.id')
            .addGroupBy('address.id')
            .addGroupBy('status.id')
            .where('recipient.recipientStatusId = :id', { id: approvedStatus.id });

        /**
         * Search Term
         */

        if (search) {
            query.andWhere(`recipient.search_vector @@ to_tsquery('simple', '${search}')`);
        }

        /**
         * Filters
         */

        if (filter?.tags) {
            this.addCharityTagFilters(query, filter.tags);
        }

        if (filter?.cause) {
            this.addCharityCause(query, filter.cause);
        }

        if (filter?.location) {
            this.addCharityLocation(query, filter.location);
        }

        if (filter?.rating) {
            this.addCharityRating(query, filter.rating);
        }

        /**
         * Order Bys
         */

        if (orderBy?.relevance) {
            query.addOrderBy('rank', orderBy.relevance);
        }

        if (orderBy?.popular) {
            query.addOrderBy('popularity', orderBy.popular);
        }

        if (orderBy?.new) {
            query.addSelect('NOW()::timestamp - recipient.vettedOn', 'vetted_ago');
            query.addOrderBy('vetted_ago', orderBy.new === 'ASC' ? 'DESC' : 'ASC');
        }

        query.addOrderBy('recipient.name', 'ASC');

        const count = await query.getCount();

        if (skip) {
            query.skip(skip);
        }

        if (take) {
            query.take(take);
        }

        const data = await query.getMany();

        const [{ current_timestamp: timestamp }] = await context.typeorm.query(
            'SELECT CURRENT_TIMESTAMP'
        );

        return {
            data,
            count,
            timestamp
        };
    }

    /**
     * Filter charities query by tags
     * @param query
     * @param tags
     */

    addCharityTagFilters(
        query: SelectQueryBuilder<Recipient>,
        tags: CharityFilterTag[]
    ): SelectQueryBuilder<Recipient> {
        query.andWhere(
            new Brackets(qb => {
                // featured
                if (tags.includes(CharityFilterTag.FEATURED)) {
                    qb.orWhere("tags.name = 'initiative'");
                }

                // favorite
                if (tags.includes(CharityFilterTag.FAVORITE)) {
                    qb.orWhere("tags.name = 'favorite'");
                }

                // preapproved
                if (tags.includes(CharityFilterTag.PREAPPROVED)) {
                    qb.orWhere('status.name = :name', {
                        name: RecipientStatusName.APPROVED
                    });
                }
            })
        );

        return query;
    }

    /**
     * Filter charities query by causes
     * @param query
     * @param causes
     */

    addCharityCause(
        query: SelectQueryBuilder<Recipient>,
        causes: string[]
    ): SelectQueryBuilder<Recipient> {
        query.andWhere(
            new Brackets(qb => {
                causes.forEach(causeId => {
                    qb.orWhere(`causes.id = '${causeId}'`);
                });
            })
        );

        return query;
    }

    /**
     * Filter charities query by states
     * @param query
     * @param states
     */

    addCharityLocation(
        query: SelectQueryBuilder<Recipient>,
        states: string[]
    ): SelectQueryBuilder<Recipient> {
        query.andWhere(
            new Brackets(qb => {
                states.forEach(state => {
                    qb.orWhere(`address.state = '${state}'`);
                });
            })
        );

        return query;
    }

    /**
     * Filter charities query by GuideStar transparency rating
     * @param query
     * @param ratings
     */

    addCharityRating(
        query: SelectQueryBuilder<Recipient>,
        ratings: GuideStarSeal[]
    ): SelectQueryBuilder<Recipient> {
        query.andWhere(
            new Brackets(qb => {
                ratings.forEach(rating => {
                    qb.orWhere(`recipient.guideStarSeal = '${rating}'`);
                });
            })
        );

        return query;
    }

    /**
     * Create Recipient
     * @param context
     * @param input
     */

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async createNewRecipient(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateGrantRecipientInput
    ): Promise<Recipient> {
        const manager = context.typeorm.manager;

        // Attempt to match EIN to existing recipient
        const existingRecipient = await manager.findOne(Recipient, {
            ein: input.employerIdentificationNumber
        });

        // Return existing recipient
        if (existingRecipient) return existingRecipient;

        // Lookup in GuideStar by EIN
        const client = new GuidestarClient();
        const data = await client.getCharityData(input.employerIdentificationNumber);

        // If found, create from GuideStar data
        // If not, create from form input
        return this.saveRecipient(
            context,
            data
                ? await this.mapGuideStarDataToRecipient(context, data)
                : await this.mapFormInputToRecipient(context, input)
        );
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Mutation(type => RecipientPreferredPayment)
    async createOrUpdateRecipientPreferredPayment(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateRecipientPreferredPaymentInput
    ): Promise<RecipientPreferredPayment> {
        const manager = context.typeorm.manager;
        let recipientPreferredPayment;
        const profile = await this.getCurrentUserProfile(context);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.recipientTags', 'recipientTags')
            .leftJoinAndSelect('recipientTags.tag', 'tag')
            .where('recipient.id = :id', { id: input.recipientId })
            .getOne();

        const paymentTypeFrom = recipient.paymentType as PaymentTypeValue;

        recipient.paymentType = input.paymentType as PaymentTypeValue;

        await manager.save(recipient);

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.PREFERRED_PAYMENT_EDITED,
                paymentChanges: {
                    preferredPayment: {
                        to: input.paymentType,
                        from: paymentTypeFrom
                    }
                },
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );
        // Attempt to match EIN to existing recipient
        const recipientPreferredPaymentExists = await manager.findOne(RecipientPreferredPayment, {
            recipientId: input.recipientId
        });

        const metadata = {
            achMetadata: {
                bankName: input.achBankName,
                accountNumber: input.achAccountNumber,
                routingNumber: input.achRoutingNumber,
                beneficiaryName: input.achBeneficiaryName
            },
            wireMetadata: {
                bankName: input.wireBankName,
                accountNumber: input.wireAccountNumber,
                wireNumber: input.wireNumber,
                beneficiaryName: input.wireBeneficiaryName,
                bankAddress: {
                    address1: input.bankAddress.address1,
                    address2: input.bankAddress.address2,
                    city: input.bankAddress.city,
                    state: input.bankAddress.state,
                    zip: input.bankAddress.zip
                }
            },
            checkMetadata: {
                address: input.address
            }
        };

        if (!!recipientPreferredPaymentExists) {
            recipientPreferredPayment = recipientPreferredPaymentExists;
            recipientPreferredPayment.metadata = metadata;
            recipientPreferredPayment.paymentType = input.paymentType;
            await manager.save(recipientPreferredPayment);
        } else {
            recipientPreferredPayment = await manager.save(
                manager.create(RecipientPreferredPayment, {
                    createdBy: profile.id,
                    updatedBy: profile.id,
                    metadata: metadata,
                    recipientId: input.recipientId,
                    paymentType: input.paymentType
                })
            );
        }

        return recipientPreferredPayment;
    }

    /**
     * Get RecipientSearchResult from transaction code
     * @param context
     * @param transactionCode
     */

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => RecipientSearchResult)
    async getRecipientFromTransactionCode(
        @Ctx() context: GraphQLContext,
        @Arg('transactionCode') transactionCode: string
    ): Promise<RecipientSearchResult> {
        const { manager } = context.typeorm;

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoin('recipient.fundDestinations', 'destination')
            .leftJoin('destination.fundTransaction', 'transaction')
            .leftJoinAndSelect('recipient.contact', 'contact')
            .leftJoinAndSelect('contact.primaryAddress', 'primaryAddress')
            .leftJoinAndSelect('contact.primaryPhone', 'primaryPhone')
            .where('transaction.transactionCode = :code', { code: transactionCode })
            .getOne();

        return {
            id: recipient.id,
            ein: recipient.ein,
            name: recipient.name,
            contactName: recipient.contact.orgContactName,
            addressLineOne: recipient.contact.primaryAddress.lineOne,
            addressLineTwo: recipient.contact.primaryAddress.lineTwo,
            city: recipient.contact.primaryAddress.city,
            state: recipient.contact.primaryAddress.state,
            zip: recipient.contact.primaryAddress.postalCode,
            phone: recipient.contact.primaryPhone.value
        };
    }

    /**
     * Map GuideStar Essentials API results to RecipientSearchResult[]
     * @param data
     */

    createSearchResults(data = []): RecipientSearchResult[] {
        return data.map(item => ({
            id: item.id || null,
            ein: item.ein,
            name: formatCharityName(item.organization_name),
            contactName: item.contact_name,
            addressLineOne: item.address_line_1,
            addressLineTwo: item.address_line_2,
            city: item.city,
            state: item.state,
            zip: item.zip,
            phone: item.contact_phone
        }));
    }

    /**
     * Map GuideStar Premier API results to Recipient and related records
     * @param context
     * @param summary
     */

    async mapGuideStarDataToRecipient(
        context: GraphQLContext,
        data: GuideStarGetCharityDataResponse
    ): Promise<Recipient> {
        const { manager } = context.typeorm;
        const userProfile = await this.getCurrentUserProfile(context);

        // Get initial status
        const recipientStatus = await manager.findOne(RecipientStatus, {
            name: RecipientStatusName.PENDING
        });

        // Create RecipientContactAddress
        const [address] = data.summary.addresses;
        const recipientContactAddress = manager.create(RecipientContactAddress, {
            lineOne: address.address_line_1,
            lineTwo: address.address_line_2 || null,
            city: address.city,
            state: address.state,
            postalCode: address.postal_code,
            country: address.country,
            isPrimary: true,
            createdBy: userProfile.id,
            updatedBy: userProfile.id
        });

        // Create Donation RecipientContactAddress
        const donationAddress = data.summary.addresses.find(
            address => address.address_type === 'Payment/Donation Address'
        );

        let recipientDonationAddress: RecipientContactAddress | null = null;
        if (!!donationAddress) {
            recipientDonationAddress = manager.create(RecipientContactAddress, {
                lineOne: donationAddress.address_line_1,
                lineTwo: donationAddress.address_line_2 || null,
                city: donationAddress.city,
                state: donationAddress.state,
                postalCode: donationAddress.postal_code,
                country: donationAddress.country,
                isPrimary: false,
                isDonationAddress: true,
                createdBy: userProfile.id,
                updatedBy: userProfile.id
            });
        }

        // Create RecipientContactPhone
        const recipientContactPhone = manager.create(RecipientContactPhone, {
            value: data.summary.contact_phone.replace(/\D/g, ''),
            isPrimary: true,
            createdBy: userProfile.id,
            updatedBy: userProfile.id
        });

        // Create RecipientContactEmail
        const recipientContactEmail = manager.create(RecipientContactEmail, {
            value: data.summary.contact_email || '',
            isPrimary: true,
            createdBy: userProfile.id,
            updatedBy: userProfile.id
        });

        // Create RecipientContact
        const recipientContact = manager.create(RecipientContact, {
            orgContactName: data.summary.contact_name || null,
            isPrimary: true,
            createdBy: userProfile.id,
            updatedBy: userProfile.id,
            primaryAddress: recipientContactAddress,
            donationAddress: recipientDonationAddress,
            primaryPhone: recipientContactPhone,
            primaryEmail: recipientContactEmail
        });

        // Create RecipientCause(s)
        const causes = data.summary.ntee_codes.reduce((causes: Promise<Cause>[], data) => {
            if (!data.primary_code) return causes;
            causes.push(getCauseByCode(manager, data.primary_code));
            return causes;
        }, []);

        const recipientCauses = await Promise.all(causes).then(causes => {
            return causes.map((cause: Cause, i) => ({
                causeId: cause.id,
                isPrimary: i === 0
            }));
        });

        // Create RecipientBoardOfDirectorsMembers
        const recipientBoardOfDirectorsMembers = data.operations.board_of_directors.map(
            ({ name, title, company }) =>
                // Normalize the inputs a bit, since they're messy from the API
                manager.create(RecipientBoardOfDirectorsMember, {
                    name: name === '' || name === ' ' ? null : name,
                    title: title === '' || title === ' ' ? null : title,
                    company: company === '' || company === ' ' ? null : company,
                    createdBy: userProfile.id,
                    updatedBy: userProfile.id
                })
        );

        // Create Recipient
        const recipient = manager.create(Recipient, {
            recipientCode: await getRecipientCode(manager),
            name: formatCharityName(data.summary.organization_name),
            description: data.summary.mission,
            ein: data.summary.ein,
            website: data.summary.website_url,
            // TODO
            code: null,
            npoStatus: data.charitycheck.subsection_description,
            nteeCode: data.summary.ntee_code,
            ofac: data.charitycheck.ofac_status,
            pub78: data.charitycheck.pub78_verified === 'True',
            photos: data.summary.photos.map(p => p.picture_url).filter(p => p.length),
            logo: data.summary.logo_url,
            guideStarSeal: ['Expired', 'None'].includes(data.summary.gs_profile_update_level)
                ? null
                : data.summary.gs_profile_update_level.replace(/\s\d+/, ''),
            recipientStatusId: recipientStatus.id,
            createdBy: userProfile.id,
            updatedBy: userProfile.id,
            contact: recipientContact,
            recipientCauses: recipientCauses,
            boardOfDirectors: recipientBoardOfDirectorsMembers
        });

        return recipient;
    }

    async mapFormInputToRecipient(
        context: GraphQLContext,
        input: CreateGrantRecipientInput
    ): Promise<Recipient> {
        const { manager } = context.typeorm;
        const userProfile = await this.getCurrentUserProfile(context);

        // Get initial status
        const recipientStatus = await manager.findOne(RecipientStatus, {
            name: RecipientStatusName.PENDING
        });

        // Create RecipientContactAddress
        const recipientContactAddress =
            input.addressLineOne == null
                ? null
                : manager.create(RecipientContactAddress, {
                      lineOne: input.addressLineOne,
                      lineTwo: input.addressLineTwo,
                      city: input.city,
                      state: input.state,
                      postalCode: input.postalCode,
                      country: 'USA',
                      isPrimary: true,
                      createdBy: userProfile.id,
                      updatedBy: userProfile.id
                  });

        // Create RecipientContactPhone
        const recipientContactPhone =
            input.contactPhoneNumber == null
                ? null
                : manager.create(RecipientContactPhone, {
                      value: input.contactPhoneNumber.replace(/\D/g, ''),
                      isPrimary: true,
                      createdBy: userProfile.id,
                      updatedBy: userProfile.id
                  });

        // Create RecipientContact
        const recipientContact =
            input.contactName === null
                ? null
                : manager.create(RecipientContact, {
                      orgContactName: input.contactName,
                      isPrimary: true,
                      createdBy: userProfile.id,
                      updatedBy: userProfile.id,
                      primaryAddress: recipientContactAddress,
                      primaryPhone: recipientContactPhone
                  });

        // Create Recipient
        const recipient = manager.create(Recipient, {
            name: input.name,
            recipientCode: await getRecipientCode(
                manager
            ) /* added this to avoid breaking admin view all charities table */,
            ein: input.employerIdentificationNumber,
            recipientStatusId: recipientStatus.id,
            createdBy: userProfile.id,
            updatedBy: userProfile.id,
            contact: recipientContact,
            causes: []
        });

        return recipient;
    }

    /**
     * Save Recipient and related records
     * @param context
     * @param recipient
     */

    async saveRecipient(context: GraphQLContext, recipient: Recipient): Promise<Recipient> {
        const { manager } = context.typeorm;

        return await manager.transaction(async dbTransaction => {
            // Save Recipient
            const createdRecipient = await dbTransaction.save(Recipient, recipient);

            // Save RecipientContact
            const contact = await dbTransaction.save(RecipientContact, {
                ...recipient.contact,
                recipientId: createdRecipient.id
            });

            // Save RecipientContactAddress
            await dbTransaction.save(RecipientContactAddress, {
                ...recipient.contact.primaryAddress,
                recipientContactId: contact.id
            });

            // Save RecipientContactPhone
            await dbTransaction.save(RecipientContactPhone, {
                ...recipient.contact.primaryPhone,
                recipientContactId: contact.id
            });

            // Recipient email not collected in form
            if (recipient.contact.primaryEmail) {
                // Save RecipientContactEmail
                await dbTransaction.save(RecipientContactEmail, {
                    ...recipient.contact.primaryEmail,
                    recipientContactId: contact.id
                });
            }

            // Save RecipientCause(s)
            if (recipient.recipientCauses) {
                await dbTransaction.save(
                    RecipientCause,
                    recipient.recipientCauses.map(recipientCause => ({
                        ...recipientCause,
                        recipientId: createdRecipient.id
                    }))
                );
            }

            if (recipient.boardOfDirectors) {
                await dbTransaction.save(
                    RecipientBoardOfDirectorsMember,
                    recipient.boardOfDirectors.map(recipientBoardOfDirectorsMember => ({
                        ...recipientBoardOfDirectorsMember,
                        recipientId: createdRecipient.id
                    }))
                );
            }

            return createdRecipient;
        });
    }

    /**
     * Get trending causes
     * @param context
     */

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [Cause])
    async getTrendingCauses(@Ctx() context: GraphQLContext): Promise<Cause[]> {
        const { manager } = context.typeorm;

        // get interval setting
        const interval = await manager
            .getRepository(Tenant)
            .findOne()
            .then(tenant => tenant.appSetting.charityCurationSettings.trendingCauseInterval)
            .catch(() => 'month');

        return manager
            .createQueryBuilder(Cause, 'cause')
            .addSelect('count(destination) as recentGrantCount')
            .addSelect('random() as "rand"')
            .leftJoin('cause.recipients', 'recipient')
            .leftJoin('recipient.fundDestinations', 'destination')
            .where(`destination.createdOn > 'now'::timestamp - '1 ${interval}'::interval`)
            .groupBy('cause.id')
            .orderBy('rand')
            .getMany();
    }

    /**
     * Get Curated Charities
     * @param context
     * @param category
     */

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [Recipient])
    async getCuratedCharities(
        @Ctx() context: GraphQLContext,
        @Arg('category', type => CuratedCategory) category: CuratedCategory,
        @Arg('take', type => Int, { nullable: true }) take?: number
    ): Promise<Recipient[]> {
        const { manager } = context.typeorm;

        switch (category) {
            case CuratedCategory.favorites: {
                return this.getFavoriteCharities(manager, take);
            }
            case CuratedCategory.initiatives: {
                return this.getInitiativeCharities(manager, take);
            }
            case CuratedCategory.new: {
                return this.getRecentlyApprovedCharities(manager, take);
            }
            case CuratedCategory.popular: {
                return this.getPopularCharities(manager, take);
            }
        }
    }

    /**
     * Get charities tagged as 'favorite' in random order
     * @param manager
     * @param take
     */

    async getFavoriteCharities(manager: EntityManager, take = 6): Promise<Recipient[]> {
        return manager
            .createQueryBuilder(Recipient, 'recipient')
            .addSelect('random() as "rand"')
            .leftJoin('recipient.recipientTags', 'recipientTags')
            .leftJoin('recipientTags.tag', 'tag')
            .where('tag.name = :tag', { tag: 'favorite' })
            .limit(take)
            .orderBy('rand')
            .getMany();
    }

    /**
     * Get charities tagged as 'initiative' in random order
     * @param manager
     * @param take
     */

    async getInitiativeCharities(manager: EntityManager, take = 5): Promise<Recipient[]> {
        return manager
            .createQueryBuilder(Recipient, 'recipient')
            .addSelect('random() as "rand"')
            .leftJoin('recipient.recipientTags', 'recipientTags')
            .leftJoin('recipientTags.tag', 'tag')
            .where('tag.name = :tag', { tag: 'initiative' })
            .limit(take)
            .orderBy('rand')
            .getMany();
    }

    /**
     * Get recently approved charities in random order
     * @param manager
     * @param take
     */

    async getRecentlyApprovedCharities(manager: EntityManager, take = 3): Promise<Recipient[]> {
        // get interval setting
        const interval = await manager
            .getRepository(Tenant)
            .findOne()
            .then(tenant => tenant.appSetting.charityCurationSettings.recentlyApprovedInterval)
            .catch(() => 'month');

        const { entities } = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .innerJoinAndSelect('recipient.recipientStatus', 'status')
            .addSelect('random() as "rand"')
            .where('status.name = :name', { name: RecipientStatusName.APPROVED })
            .andWhere(`recipient.vettedOn > 'now'::timestamp - '1 ${interval}'::interval`)
            .limit(take)
            .orderBy('rand')
            .getRawAndEntities();

        return entities;
    }

    /**
     * Get charities in order of most grants
     * @param manager
     * @param take
     */

    async getPopularCharities(manager: EntityManager, take = 3): Promise<Recipient[]> {
        const { entities } = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoin('recipient.fundDestinations', 'fundDestinations')
            .addSelect('count("fundDestinations")', 'count')
            .groupBy('recipient.id')
            .orderBy('count', 'DESC')
            .limit(take)
            .getRawAndEntities();

        return entities;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => Recipient)
    public async getRecipientByRecipientCode(
        @Ctx() { typeorm }: GraphQLContext,
        @Arg('recipientCode', type => String) recipientCode: string
    ): Promise<Recipient> {
        const recipient = await typeorm.manager.getRepository(Recipient).findOne({ recipientCode });
        if (!recipient) throw new Error('Unable to find Recipient with specified recipientCode');
        return recipient;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => Recipient)
    public async getRecipient(
        @Ctx() { typeorm }: GraphQLContext,
        @Arg('id', type => String) id: string
    ): Promise<Recipient> {
        const recipient = await typeorm.manager.getRepository(Recipient).findOne({ id });
        if (!recipient) throw new Error('Unable to find Recipient with specified id');
        return recipient;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => [Recipient])
    public async getRelatedCharities(
        @Ctx() { typeorm }: GraphQLContext,
        @Arg('recipientId', type => String) recipientId: string,
        @Arg('take', type => Int, { nullable: true }) take = 3
    ): Promise<Recipient[]> {
        const { manager } = typeorm;
        const related = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .addSelect('random()', 'rand')
            .leftJoinAndSelect('recipient.causes', 'cause')
            .leftJoinAndSelect('cause.recipients', 'causeRecipient')
            .where('causeRecipient.id = :id', { id: recipientId })
            .andWhere('recipient.id != :requestedId', {
                requestedId: recipientId
            }) /* don't select the same recipient */
            .limit(take)
            .orderBy('rand')
            .getMany();

        return related;
    }

    @PermissionLock(PermissionAccessType.USER_DEFAULTS, PermissionAccessLevel.FULL)
    @Query(type => RecipientSearchResult, {
        description:
            'Queries the Edison database for one Recipient with the provided EIN; if none exist, queries the GuideStar API'
    })
    public async searchRecipientByEIN(
        @Ctx() { typeorm: { manager } }: GraphQLContext,
        @Arg('ein', type => String) ein: string
    ): Promise<RecipientSearchResult> {
        // Return early if recipient is found in the db
        const existingRecipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.contact', 'contact')
            .leftJoinAndSelect('contact.primaryPhone', 'primaryPhone')
            .leftJoinAndSelect('contact.primaryAddress', 'primaryAddress')
            .leftJoinAndSelect('contact.primaryEmail', 'primaryEmail')
            .where('recipient.ein = :ein', {
                ein
            })
            .getOne();

        if (existingRecipient) {
            return {
                id: existingRecipient.id,
                name: existingRecipient.name,
                ein,
                contactName: existingRecipient.contact.orgContactName,
                addressLineOne: existingRecipient.contact.primaryAddress.lineOne,
                addressLineTwo: existingRecipient.contact.primaryAddress.lineTwo,
                city: existingRecipient.contact.primaryAddress.city,
                state: existingRecipient.contact.primaryAddress.state,
                zip: existingRecipient.contact.primaryAddress.postalCode,
                phone: existingRecipient.contact.primaryPhone.value
            };
        }

        // If no record exists, search for the EIN in Guidestar
        // TODO: test once Guidestar API is queryable
        const client = new GuidestarClient();
        // Get suggested results from GuideStar
        const result = await client.search(ein).then(results => {
            // map to RecipientSearchResult
            const [result] = this.createSearchResults(results.slice(0));
            return result;
        });

        if (!result) throw new Error('A recipient with that EIN could not be found');

        return result;
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async updateRecipientStatus(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateRecipientInput
    ): Promise<Recipient> {
        const repo = context.typeorm.getRepository(Recipient);
        const recipient = await repo.findOne(input.id);
        const { manager } = context.typeorm;

        const recipientStatus = await context.typeorm
            .createQueryBuilder(RecipientStatus, 'status')
            .where('status.name = :name', { name: input.recipientStatus })
            .getOne();

        const profile = await this.getCurrentUserProfile(context);

        recipient.recipientStatus = recipientStatus;
        recipient.recipientStatusId = recipientStatus.id;

        // Set the vettedOn date, based on whether the status change reflects approval
        if (input.recipientStatus === RecipientStatusName.APPROVED) {
            recipient.vettedOn = new Date();
        } else {
            recipient.vettedOn = null;
        }

        // Create Recipient Event
        if (input.recipientStatus !== 'PENDING') {
            await manager.save(
                manager.create(RecipientEvent, {
                    createdBy: profile.id,
                    updatedBy: profile.id,
                    name:
                        input.recipientStatus === 'APPROVED'
                            ? RecipientEventNameValues.APPROVED
                            : RecipientEventNameValues.DENIED,
                    recipientId: recipient.id,
                    userProfileId: profile.id
                })
            );
        }

        return await repo.save(recipient);
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async updateApprovalExpirationDate(
        @Ctx() context: GraphQLContext,
        @Arg('recipientId') recipientId: string,
        @Arg('expirationDate', { nullable: true }) expDate: Date | null
    ): Promise<Recipient> {
        // Ensure the date (if not null) is valid and in the correct format
        if (expDate && dayjs(expDate).format('MM/DD/YYYY') === 'Invalid Date') {
            throw new Error('Please provide a valid date');
        }

        // Ensure the date is today or in the future
        if (!dayjs(expDate).isSame(dayjs(), 'day') && !dayjs(expDate).isAfter(dayjs(), 'day')) {
            throw new Error(
                `Invalid date: date must be the current date (${dayjs().format(
                    'MM/DD/YYYY'
                )}) or later`
            );
        }

        const profile = await this.getCurrentUserProfile(context);
        const manager = context.typeorm.manager;
        const repo = context.typeorm.getRepository(Recipient);
        const recipient = await repo.findOne(recipientId, { relations: ['recipientStatus'] });

        if (!recipient) throw new Error('Recipient at provided id not found');
        if (expDate && recipient.recipientStatus.name !== RecipientStatusName.APPROVED) {
            throw new Error(
                "Unable to edit the approvalExpirationDate unless the recipient's status is APPROVED"
            );
        }

        recipient.approvalExpirationDate = expDate;

        // Create Recipient Event, and save the updated date
        await Promise.all([
            manager.save(
                manager.create(RecipientEvent, {
                    createdBy: profile.id,
                    updatedBy: profile.id,
                    name: RecipientEventNameValues.EDITED,
                    recipientId: recipient.id,
                    userProfileId: profile.id
                })
            ),
            repo.save(recipient)
        ]);

        return recipient;
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async updateCharityName(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateRecipientInput
    ): Promise<Recipient> {
        const repo = context.typeorm.getRepository(Recipient);
        const { id, name } = input;
        const recipient = await repo.findOne(id);
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        recipient.name = name;

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.EDITED,
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );

        return await repo.save(recipient);
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean)
    async deleteBoardMember(
        @Ctx() context: GraphQLContext,
        @Arg('id') id: string
    ): Promise<boolean> {
        const repo = context.typeorm.getRepository(RecipientBoardOfDirectorsMember);

        const result = await repo.delete(id);

        if (result) return true;

        return false;
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => RecipientBoardOfDirectorsMember)
    async createBoardMemberForRecipient(
        @Ctx() context: GraphQLContext,
        @Arg('name') name: string,
        @Arg('company') company: string,
        @Arg('recipientId') recipientId: string
    ): Promise<RecipientBoardOfDirectorsMember> {
        const repo = context.typeorm.getRepository(RecipientBoardOfDirectorsMember);

        return await repo.save(repo.create({ name, company, recipientId }));
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async toggleFeatured(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateRecipientInput
    ): Promise<Recipient> {
        const { id } = input;
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.recipientTags', 'recipientTags')
            .leftJoinAndSelect('recipientTags.tag', 'tag')
            .where('recipient.id = :id', { id })
            .getOne();

        const featuredTag = await manager
            .createQueryBuilder(Tag, 'tag')
            .where('tag.name = :name', { name: 'initiative' })
            .getOne();

        const isFavorite =
            recipient &&
            recipient.recipientTags &&
            recipient.recipientTags.some(rt => rt.tagId === featuredTag.id);

        if (isFavorite && featuredTag) {
            await manager.delete(RecipientTag, {
                recipientId: recipient.id,
                tagId: featuredTag.id
            });
        } else {
            const { id: rtId } = await manager.save(
                manager.create(RecipientTag, {
                    recipientId: id,
                    tagId: featuredTag.id
                })
            );
        }

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.EDITED,
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );

        return recipient;
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async toggleFavorite(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateRecipientInput
    ): Promise<Recipient> {
        const { id } = input;
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.recipientTags', 'recipientTags')
            .leftJoinAndSelect('recipientTags.tag', 'tag')
            .where('recipient.id = :id', { id })
            .getOne();

        const favoriteTag = await manager
            .createQueryBuilder(Tag, 'tag')
            .where('tag.name = :name', { name: CharityFilterTag.FAVORITE })
            .getOne();

        const isFavorite =
            recipient &&
            recipient.recipientTags &&
            recipient.recipientTags.some(rt => rt.tagId === favoriteTag.id);

        if (isFavorite && favoriteTag) {
            await manager.delete(RecipientTag, {
                recipientId: recipient.id,
                tagId: favoriteTag.id
            });
        } else {
            const { id: rtId } = await manager.save(
                manager.create(RecipientTag, {
                    recipientId: id,
                    tagId: favoriteTag.id
                })
            );
        }

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.EDITED,
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );

        return recipient;
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async uploadLogo(
        @Ctx() context: GraphQLContext,
        @Arg('image', () => GraphQLUpload) image: Upload,
        @Arg('recipientId') recipientId: string
    ): Promise<Recipient> {
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const client = new StorageClient();

        const [storageResult] = await client.uploadPhotos([image]);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.recipientTags', 'recipientTags')
            .leftJoinAndSelect('recipientTags.tag', 'tag')
            .where('recipient.id = :id', { id: recipientId })
            .getOne();

        if (storageResult) {
            recipient.logo = storageResult as string;
        }

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.EDITED,
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );

        return manager.save(recipient);
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async uploadBanner(
        @Ctx() context: GraphQLContext,
        @Arg('image', () => GraphQLUpload) image: Upload,
        @Arg('recipientId') recipientId: string
    ): Promise<Recipient> {
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const client = new StorageClient();

        const [storageResult] = await client.uploadPhotos([image]);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.recipientTags', 'recipientTags')
            .leftJoinAndSelect('recipientTags.tag', 'tag')
            .where('recipient.id = :id', { id: recipientId })
            .getOne();

        if (storageResult) {
            recipient.banner = storageResult as string;
        }

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.EDITED,
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );

        return manager.save(recipient);
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async updateRecipientOperations(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateRecipientInput
    ): Promise<Recipient> {
        const { id } = input;
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.recipientTags', 'recipientTags')
            .leftJoinAndSelect('recipientTags.tag', 'tag')
            .where('recipient.id = :id', { id })
            .getOne();

        const { numberOfEmployees } = input;

        recipient.numberOfEmployees = numberOfEmployees;

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.EDITED,
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );

        return manager.save(recipient);
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async updateRecipientAdditionalInfo(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateRecipientInput
    ): Promise<Recipient> {
        const { id } = input;
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.recipientTags', 'recipientTags')
            .leftJoinAndSelect('recipientTags.tag', 'tag')
            .where('recipient.id = :id', { id })
            .getOne();

        console.log('input!!~', input);

        recipient.foundationTypeCode = input.foundationCode;
        recipient.bmfOrganizationName = input.bmfOrganizationName;
        recipient.pub78 = input.pub78;
        recipient.npoStatus = input.npoStatus;

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.EDITED,
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );

        return manager.save(recipient);
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async setPaymentTypeForRecipient(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateRecipientInput
    ): Promise<Recipient> {
        const { id, paymentType } = input;
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.recipientTags', 'recipientTags')
            .leftJoinAndSelect('recipientTags.tag', 'tag')
            .where('recipient.id = :id', { id })
            .getOne();

        const paymentTypeFrom = recipient.paymentType;

        recipient.paymentType = paymentType;

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.PREFERRED_PAYMENT_EDITED,
                paymentChanges: {
                    preferredPayment: {
                        to: paymentType,
                        from: paymentTypeFrom
                    }
                },
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );

        return manager.save(recipient);
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async updateRecipientSummary(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: UpdateRecipientInput
    ): Promise<Recipient> {
        const { id } = input;
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.contact', 'contact')
            .leftJoinAndSelect('contact.primaryAddress', 'primaryAddress')
            .where('recipient.id = :id', { id })
            .getOne();

        // Simple Fields
        const { ein, website, description, contact, keywords, alsoKnownAs } = input;
        recipient.ein = ein;
        recipient.website = website;
        recipient.alsoKnownAs = alsoKnownAs;
        recipient.description = description;
        recipient.keywords = keywords;

        // RecipientContact
        const recipientContact = manager.create(RecipientContact, recipient.contact);

        // PrimaryAddress
        const primaryAddressObject = { ...contact.donationAddress };
        if (primaryAddressObject.id === null) {
            delete primaryAddressObject.id;
        }

        const primaryAddress = manager.create(RecipientContactAddress, {
            ...contact.primaryAddress
        });
        primaryAddress.recipientContactId = recipientContact.id;

        // DonationAddress
        const donationAddressObject = { ...contact.donationAddress };
        if (donationAddressObject.id === null) {
            delete donationAddressObject.id;
        }
        const donationAddress = manager.create(RecipientContactAddress, donationAddressObject);
        donationAddress.isDonationAddress = true;
        donationAddress.isPrimary = false;
        donationAddress.recipientContactId = recipientContact.id;

        // PrimaryPhone
        const primaryPhone = manager.create(RecipientContactPhone, contact.primaryPhone);
        primaryPhone.recipientContactId = recipientContact.id;

        // GOTTA SAVE EM ALL
        await manager.save(donationAddress);
        await manager.save(primaryAddress);
        await manager.save(primaryPhone);

        // Causes
        await manager.delete(RecipientCause, { recipientId: id });
        const recipientCauses = input.causes.map(cause => {
            return manager.create(RecipientCause, {
                causeId: cause.id,
                recipientId: id,
                isPrimary: cause.isPrimary,
                ordinal: cause.ordinal
            });
        });
        await manager.save(recipientCauses);

        // Create Recipient Event
        await manager.save(
            manager.create(RecipientEvent, {
                createdBy: profile.id,
                updatedBy: profile.id,
                name: RecipientEventNameValues.EDITED,
                recipientId: recipient.id,
                userProfileId: profile.id
            })
        );

        return await manager.save(recipient);
    }

    /**
     * Get non-vetted charities for admin review
     */
    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.READ)
    @Query(type => RecipientResults)
    async getDonorCreatedCharities(
        @Ctx() context: GraphQLContext,
        @Arg('orderBy', { nullable: true }) orderBy?: RecipientOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('search', { nullable: true }) search?: string
    ): Promise<RecipientResults> {
        const repo = context.typeorm.getRepository(Recipient);
        const where = {};
        const processedOrderBy = !!orderBy.recipientStatus
            ? { ...orderBy, createdOn: 'Descending' }
            : orderBy;

        let dataQuery, countQuery;
        if (search) {
            dataQuery = this.createRecipientQuery(
                repo,
                where,
                processedOrderBy,
                skip,
                take,
                search
            );
            countQuery = this.createRecipientQuery(repo, where, null, null, null, search);
        } else {
            dataQuery = this.createQuery(repo, where, processedOrderBy, skip, take, search);
            countQuery = this.createQuery(repo, where, null, null, null, search, false);
        }

        return {
            timestamp: new Date(),
            data: await dataQuery.getMany(),
            count: await countQuery.getCount()
        };
    }

    createRecipientQuery(
        repo: Repository<Recipient>,
        where?: any,
        orderBy?: any,
        skip?: number,
        take?: number,
        search?: string
    ): SelectQueryBuilder<Recipient> {
        const builder = repo.createQueryBuilder('entity');

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
            builder.addSelect('levenshtein(:levenshtein, entity.name)', 'rank');
            builder.setParameter('levenshtein', search);
            builder.addOrderBy('rank', 'ASC');
            builder.andWhere('entity.name ILIKE :search OR entity.recipientCode ILIKE :search', {
                search: '%' + search + '%'
            });
        }

        return builder;
    }

    /**
     * Format TS Query
     * @param search
     */

    protected getTSQuery(query: string) {
        return query
            .toLowerCase()
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .split(' ')
            .filter(s => s.length)
            .map(s => `${s.trim()}:*`)
            .join(' & ');
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async updateRecipientAttentionTo(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => [RecipientContactInput]) input: RecipientContactInput[]
    ): Promise<Recipient> {
        const { id: recipientId } = input[0]; // All contacts will be for same recipient
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const recipientContactIds = input.map(contact => contact.recipientContactId);

        manager.transaction(async transaction => {
            const toBeDeletedContacts = await transaction
                .createQueryBuilder(RecipientContact, 'recipientContact')
                .where('id NOT IN (:...ids)', { ids: recipientContactIds })
                .andWhere('recipient_id = :recipientId', { recipientId })
                .andWhere('is_primary = FALSE')
                .getMany();

            toBeDeletedContacts.forEach(async contact => {
                await transaction.query(/* sql */ `
                    DELETE
                    FROM recipient_contact_phone
                    WHERE recipient_contact_id = '${contact.id}'
                `);

                await transaction.query(/* sql */ `
                    DELETE
                    FROM recipient_contact_email
                    WHERE recipient_contact_id = '${contact.id}'
                `);

                await transaction.query(/* sql */ `
                    DELETE
                    FROM recipient_contact_address
                    WHERE recipient_contact_id = '${contact.id}'
                `);

                await transaction.query(/* sql */ `
                    DELETE
                    FROM recipient_contact
                    WHERE id = '${contact.id}'
                `);
            });

            for (const contactInput of input) {
                let contact = null as RecipientContact | null;

                if (contactInput.recipientContactId) {
                    contact = await transaction.findOne(RecipientContact, {
                        id: contactInput.recipientContactId
                    });
                }
                if (contact) {
                    contact.orgContactName = contactInput.name;

                    // Email section
                    if (contactInput.email.id) {
                        const contactEmail = await transaction.findOne(RecipientContactEmail, {
                            id: contactInput.email.id
                        });
                        if (contactEmail) {
                            contactEmail.value = contactInput.email.value;
                            await transaction.save(contactEmail);
                        } else {
                            await transaction.save(
                                transaction.create(RecipientContactEmail, {
                                    recipientContactId: contact.id,
                                    value: contactInput.email.value
                                })
                            );
                        }
                    } else {
                        await transaction.save(
                            transaction.create(RecipientContactEmail, {
                                recipientContactId: contact.id,
                                value: contactInput.email.value
                            })
                        );
                    }

                    // Phone Section
                    if (contactInput.primaryPhone.id) {
                        const phone = await transaction.findOne(RecipientContactPhone, {
                            id: contactInput.primaryPhone.id
                        });
                        if (phone) {
                            phone.value = contactInput.primaryPhone.value;
                            await transaction.save(phone);
                        } else {
                            await transaction.save(
                                transaction.create(RecipientContactPhone, {
                                    recipientContactId: contact.id,
                                    value: contactInput.primaryPhone.value,
                                    isPrimary: true
                                })
                            );
                        }
                    } else {
                        await transaction.save(
                            transaction.create(RecipientContactPhone, {
                                recipientContactId: contact.id,
                                value: contactInput.primaryPhone.value,
                                isPrimary: true
                            })
                        );
                    }

                    contact.isGrantContact = contactInput.isGrantContact;

                    await transaction.save(contact);
                } else {
                    const contact = await transaction.save(
                        transaction.create(RecipientContact, {
                            recipientId,
                            id: contactInput.recipientContactId,
                            orgContactName: contactInput.name,
                            isGrantContact: contactInput.isGrantContact,
                            isPrimary: false
                        })
                    );
                    if (contactInput.email) {
                        await transaction.save(
                            transaction.create(RecipientContactEmail, {
                                recipientContactId: contact.id,
                                value: contactInput.email.value
                            })
                        );
                    }
                    if (contactInput.primaryPhone) {
                        await transaction.save(
                            transaction.create(RecipientContactPhone, {
                                recipientContactId: contact.id,
                                value: contactInput.primaryPhone.value,
                                isPrimary: true
                            })
                        );
                    }
                }
            }

            // Create Recipient Event
            await transaction.save(
                transaction.create(RecipientEvent, {
                    createdBy: profile.id,
                    updatedBy: profile.id,
                    name: RecipientEventNameValues.EDITED,
                    recipientId: recipientId,
                    userProfileId: profile.id
                })
            );
        });

        return manager.findOne(Recipient, { id: recipientId });
    }

    @PermissionLock(PermissionAccessType.ADMIN_RECIPIENTS, PermissionAccessLevel.FULL)
    @Mutation(type => Recipient)
    async deleteRecipientContact(
        @Ctx() context: GraphQLContext,
        @Arg('input', type => [RecipientContactInput]) input: RecipientContactInput[]
    ): Promise<Recipient> {
        const { id } = input[0];
        console.log('id', id);
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const recipient = await manager
            .createQueryBuilder(Recipient, 'recipient')
            .leftJoinAndSelect('recipient.contacts', 'contacts')
            .leftJoinAndSelect('contacts.phones', 'phones')
            .leftJoinAndSelect('contacts.emails', 'emails')
            .where('recipient.id = :id', { id })
            .getOne();
        console.log('recipient', recipient);

        // delete recipient contact info
        // & references to recipeintContactId for phone/email too

        return await manager.save(recipient);
    }
}
