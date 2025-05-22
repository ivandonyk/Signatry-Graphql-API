import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';
import { UpdateResult } from 'typeorm';

import { GraphQLContext } from '../context';
import { PermissionLock } from '../decorators/permissionDecorator';
import { FinancialAdvisor, InstitutionAccount } from '../models';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';
import { UtilityResolver } from './core/UtilityResolver';
import { FinancialAdvisorInput } from '../inputs/FinancialAdvisor/FinancialAdvisorInput';

@Resolver(type => FinancialAdvisor)
export class FinancialAdvisorResolver extends UtilityResolver {
    @PermissionLock(PermissionAccessType.ADMIN_FUNDS, PermissionAccessLevel.FULL)
    @Mutation(type => Boolean, {
        description: 'create new or edit existing financial advisors'
    })
    public async createEditFinancialAdvisors(
        @Ctx() context: GraphQLContext,
        @Arg('id') id: string,
        @Arg('input', type => [FinancialAdvisorInput]) input: FinancialAdvisorInput[]
    ): Promise<boolean> {
        const { typeorm } = context;
        const repo = typeorm.getRepository(FinancialAdvisor);

        const [profile, institutionAccount] = await Promise.all([
            this.getCurrentUserProfile(context),
            typeorm
                .getRepository(InstitutionAccount)
                .findOne(id, { relations: ['financialAdvisors'] })
        ]);

        const inserts: FinancialAdvisor[] = [];
        const updatePromises: Promise<UpdateResult>[] = [];
        const deleteIds: string[] = [];

        input.forEach(val => {
            const { isDeleted, isNew, id, ...modelProperties } = val;

            if (isNew) {
                // create new model
                const financialAdvisor = repo.create({
                    ...modelProperties,
                    createdBy: profile.id,
                    updatedBy: profile.id
                });
                inserts.push(financialAdvisor);
                // assign to existing array of financial advisors
                institutionAccount.financialAdvisors = [
                    ...(institutionAccount.financialAdvisors || []),
                    financialAdvisor
                ];
            } else if (isDeleted) {
                deleteIds.push(id);
            } else {
                updatePromises.push(repo.update(id, modelProperties));
            }
        });

        if (inserts.length) {
            await repo.insert(inserts);
            await typeorm.manager.save(institutionAccount);
        }
        if (updatePromises.length) await Promise.all(updatePromises);
        if (deleteIds.length) await repo.delete(deleteIds);

        return Promise.resolve(true);
    }
}
