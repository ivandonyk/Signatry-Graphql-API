import { ByAllAccountResult } from '../models/ByAllAccountResult';
import { BAAFacade } from '../morningstar/byallaccounts/facade';
import { Arg, Ctx, Int, Mutation, Query, Resolver } from 'type-graphql';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { GraphQLContext } from '../context';
import { updateInstitutionAccounts } from '../cron/accounting/updateInstitutionAccounts';
import { PermissionLock } from '../decorators/permissionDecorator';
import { InstitutionAccountFilter } from '../inputs/InstitutionAccount/InstitutionAccountFilter';
import { InstitutionAccountInput } from '../inputs/InstitutionAccount/InstitutionAccountInput';
import { InstitutionAccountOrderBy } from '../inputs/InstitutionAccount/InstitutionAccountOrderBy';
import { GLAccount, InstitutionAccount, Investment, Tenant } from '../models';
import { InstitutionAccountResult } from '../models/InstitutionAccountResult';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { UtilityResolver } from './core/UtilityResolver';
import { FundResolver } from './fund.resolver';

enum CustomInstitutionOrderByValues {
    FUND_NAME = 'fundName',
    MARKET_VALUE = 'marketValue',
    LAST_UPDATED = 'lastUpdated',
    INSTITUTION = 'institution'
}

const { BYALLACCOUNTS_USER, BYALLACCOUNTS_PASS } = process.env;

@Resolver(() => InstitutionAccount)
export class InstitutionAccountResolver extends UtilityResolver {
    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.READ)
    @Query(type => InstitutionAccountResult, {
        description:
            'Gets the InstitutionAccounts whose investment FK is null, so that the UI for linking BAA Individually Managed Accounts excludes those that have already been linked to funds'
    })
    public async getUnlinkedInstitutionAccounts(
        @Ctx() context: GraphQLContext,
        @Arg('where', type => InstitutionAccountFilter, { nullable: true })
        where?: InstitutionAccountFilter,
        @Arg('orderBy', type => InstitutionAccountOrderBy, { nullable: true })
        orderBy?: InstitutionAccountOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<InstitutionAccountResult> {
        const repo = context.typeorm.getRepository(InstitutionAccount);
        const linkedInvestments = await context.typeorm
            .getRepository(Investment)
            .createQueryBuilder('investment')
            .innerJoinAndSelect('investment.fundAllocations', 'fundAllocations')
            .getMany();
        const linkedInvestmentIds = linkedInvestments.map(i => i.id);
        const query = this.createQuery(repo, where, orderBy, skip, take, search)
            .leftJoinAndSelect('entity.investment', 'investment')
            .andWhere('entity.glAccountId IS NOT NULL')
            .andWhere('investment.id NOT IN (:...linkedInvestmentIds)', {
                linkedInvestmentIds: linkedInvestmentIds
            })
            .andWhere('entity.isSweepAccount = false');

        const count = await query.getCount();
        const result = await query.getMany();

        return {
            data: result,
            count
        };
    }
    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.READ)
    @Query(type => ByAllAccountResult, {
        description:
            'Gets the InstitutionAccounts whose investment FK is null, so that the UI for linking BAA Individually Managed Accounts excludes those that have already been linked to funds'
    })
    public async getByAllAccounts(
        @Ctx() context: GraphQLContext,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<ByAllAccountResult> {
        const repo = context.typeorm.getRepository(InstitutionAccount);
        const linkedInvestments = await context.typeorm
            .getRepository(Investment)
            .createQueryBuilder('investment')
            .innerJoinAndSelect('investment.fundAllocations', 'fundAllocations')
            .getMany();
        const linkedInvestmentIds = linkedInvestments.map(i => i.id);
        const linkedAccounts = await this.createQuery(repo)
            .leftJoinAndSelect('entity.investment', 'investment')
            .andWhere('entity.glAccountId IS NOT NULL')
            .andWhere('investment.id IN (:...linkedInvestmentIds)', {
                linkedInvestmentIds: linkedInvestmentIds
            })
            .andWhere('entity.isSweepAccount = false')
            .getMany();
        
        const facade = new BAAFacade();
        let byAllAccounts = await facade.getAllAccounts(BYALLACCOUNTS_USER, BYALLACCOUNTS_PASS);
        byAllAccounts = byAllAccounts.filter(account => {
            if (search && account.getAccountNumber().indexOf(search) === -1 && account.getName().indexOf(search) === -1) {
                return false;
            }
            return linkedAccounts.filter(linkedAccount => linkedAccount.accountId === account.getAccountId()).length === 0;
        });
        const count = byAllAccounts.length;

        byAllAccounts = byAllAccounts.slice(skip, skip + take);

        return {
            count,
            data: byAllAccounts.map(account => ({
                accountId: account.getAccountId(),
                accountNumber: account.getAccountNumber(),
                name: account.getName(),
                accountType: account.getAccountType(),
                marketValue: account.getMarketValue(),
                financialProfileId: account.getFinancialProfileId(),
                custodianName: account.getCustodianName(),
                lastUpdated: account.getLastUpdated()
            }))
        };
    }
    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.READ)
    @Query(type => InstitutionAccountResult, {
        description: 'Gets all Institution Accounts that match specified parameters'
    })
    public async getInstitutionAccounts(
        @Ctx() { typeorm }: GraphQLContext,
        @Arg('where', type => InstitutionAccountFilter, { nullable: true })
        where?: InstitutionAccountFilter,
        @Arg('orderBy', type => InstitutionAccountOrderBy, { nullable: true })
        orderBy?: InstitutionAccountOrderBy,
        @Arg('skip', type => Int, { nullable: true })
        skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<InstitutionAccountResult> {
        const repo = typeorm.getRepository(InstitutionAccount);

        const query = repo
            .createQueryBuilder('entity')
            .leftJoin('entity.investment', 'investment')
            .leftJoin('investment.fundAllocations', 'fundAllocations')
            .leftJoinAndSelect('fundAllocations.fund', 'fund');

        if (orderBy) {
            const orderKey = Object.keys(orderBy)[0];
            const orderDirection = typeof orderBy[orderKey] === 'string' ? orderBy[orderKey] : null;
            if (orderKey && orderDirection) {
                switch (orderKey) {
                    case CustomInstitutionOrderByValues.FUND_NAME:
                        query.orderBy('fund.name', orderDirection);
                        break;

                    case CustomInstitutionOrderByValues.MARKET_VALUE:
                        query.orderBy('entity.marketValue', orderDirection);
                        break;

                    case CustomInstitutionOrderByValues.LAST_UPDATED:
                        query.orderBy('entity.lastUpdated', orderDirection);
                        break;

                    case CustomInstitutionOrderByValues.INSTITUTION:
                        query.orderBy('entity.custodianName', orderDirection);
                        break;

                    default:
                        break;
                }
            }
        }

        if (search) {
            const processedSearch = search
                .replace(/[^a-zA-Z0-9\s]/g, ' ')
                .split(' ')
                .filter(s => s.length)
                .map(s => `${s.trim()}:*`)
                .join([' ', '&', ' '].join('')); // AND operator
            // Add rank
            query.addSelect('ts_rank_cd(entity.search_vector, :processedSearch, 1)', 'rank');
            // Order by rank
            query.addOrderBy('rank', 'DESC');
            // tsvector search
            query.where("entity.search_vector @@ to_tsquery('simple', :processedSearch)", {
                processedSearch
            });
        }

        if (skip) query.skip(skip);
        if (take) query.take(take);

        return Promise.resolve(query.getMany()).then(data => ({
            count: data.length,
            data
        }));
    }

    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.READ)
    @Query(type => InstitutionAccount, {
        description: 'Get Institution Account by id'
    })
    public async getInstitutionAccount(
        @Ctx() { typeorm }: GraphQLContext,
        @Arg('id') id: string
    ): Promise<InstitutionAccount> {
        return typeorm.manager.findOne(InstitutionAccount, {
            where: { id },
            relations: [
                'glAccount',
                'investment',
                'investment.subledgerFund',
                'investment.fundAllocations',
                'investment.fundAllocations.fund',
                'financialAdvisors'
            ]
        });
    }

    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.READ)
    @Query(type => [GLAccount], {
        description: 'Gets all GL Accounts that match specified parameters'
    })
    public async getGLAccounts(
        @Ctx() { typeorm }: GraphQLContext,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('search', type => String, { nullable: true }) search?: string
    ): Promise<GLAccount[]> {
        const repo = typeorm.getRepository(GLAccount);

        const query = repo
            .createQueryBuilder('entity')
            .innerJoin('entity.institutionAccount', 'ia');
        if (search) {
            const processedSearch = search
                .replace(/[^a-zA-Z0-9\s]/g, ' ')
                .split(' ')
                .filter(s => s.length)
                .map(s => `${s.trim()}:*`)
                .join([' ', '|', ' '].join(''));
            // Add rank
            query.addSelect('ts_rank_cd(ia.search_vector, :processedSearch, 1)', 'rank');
            // Order by rank
            query.addOrderBy('rank', 'DESC');
            // tsvector search
            query.where("ia.search_vector @@ to_tsquery('simple', :processedSearch)", {
                processedSearch
            });
            query.andWhere('ia.isSweepAccount = false');
        }

        query.andWhere('ia.isSweepAccount IS false');

        if (take) query.take(take);

        return await query.getMany();
    }

    /**
     *
     * @description Fetch Institution Accounts From BAA
     */
    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean, {
        description:
            'Refreshes Edison database with BAA institution accounts. NOTE: makes API call to ByAllAccounts API'
    })
    public async refreshInstitutionAccountsFromBAA(
        @Ctx() { typeorm }: GraphQLContext
    ): Promise<boolean | never> {
        await updateInstitutionAccounts(typeorm);
        return true;
    }

    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean, {
        description: 'Update Institution Account'
    })
    public async updateInstitutionAccount(
        @Ctx() context: GraphQLContext,
        @Arg('id') id: string,
        @Arg('input', type => InstitutionAccountInput) input: InstitutionAccountInput
    ): Promise<boolean> {
        const { typeorm } = context;
        const repo = typeorm.getRepository(InstitutionAccount);

        // fetch IA and GL accounts
        const ia = await repo.findOne({
            where: { id },
            relations: ['glAccount', 'investment', 'investment.fundAllocations']
        });

        const setValues: QueryDeepPartialEntity<InstitutionAccount> = {};

        // split into IA and GL values
        const { displayName = '', url = '', fundId = '', ...glValues } = input;

        // update IA values if available
        if (displayName.length) setValues.displayName = displayName;
        if (url.length) setValues.url = url;
        if (fundId.length) {
            try {
                await new FundResolver().addIndividuallyManagedAccountToFund(context, {
                    institutionAccountId: ia.id,
                    fundId,
                    override: true
                });
            } catch (error) {
                console.error('error assigning fund to IA record\n', error);
            }
        }

        // don't override existing gl account relations and validate gl values
        if (
            !ia.glAccount &&
            Object.values(glValues).length &&
            Object.values(glValues).every(val => val.length)
        ) {
            const glRepo = typeorm.getRepository(GLAccount);

            const tenant = await typeorm.manager.getRepository(Tenant).findOne();
            // create record
            const glAccount = await glRepo.save(
                glRepo.create({
                    ...glValues,
                    tenantId: tenant.id
                })
            );
            // save relation
            setValues.glAccount = glAccount;
        }

        // save IA record
        await repo.update({ id }, setValues);

        return Promise.resolve(true);
    }
}
