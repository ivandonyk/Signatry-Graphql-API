import { InstitutionAccount, Holding, Fund, Investment } from '../models';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { Resolver, FieldResolver, Ctx, Root, Info, Int, Float, Arg } from 'type-graphql';

@Resolver(type => InstitutionAccount)
export class InstitutionAccountResolver extends UtilityResolver {
    @FieldResolver(type => Boolean)
    public async hasFundInvestment(
        @Root() root: InstitutionAccount,
        @Ctx() context: GraphQLContext
    ) {
        const repo = context.typeorm.getRepository(InstitutionAccount);
        const result = await repo
            .createQueryBuilder('instAcct')
            .leftJoinAndSelect('instAcct.investment', 'investment')
            .leftJoinAndSelect('investment.fundAllocations', 'fundAllocations')
            .where('instAcct.id = :id', { id: root.id })
            .getOne();
        return result.investment !== null && result.investment.fundAllocations !== null;
    }

    @FieldResolver(type => [InstitutionAccount])
    public async sweepAccounts(@Root() root: InstitutionAccount, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(InstitutionAccount);
        if (!root.sweepAccounts) {
            root.sweepAccounts = await repo.find({ institutionAccountId: root.id });
        }
        return root.sweepAccounts;
    }

    @FieldResolver(type => [Holding])
    public async holdings(@Root() root: InstitutionAccount, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(Holding);
        if (!root.holdings) {
            root.holdings = await repo.find({ institutionAccountId: root.id });
        }
        return root.holdings;
    }

    @FieldResolver(type => Investment)
    public async investment(@Root() root: InstitutionAccount, @Ctx() context: GraphQLContext) {
        const repo = context.typeorm.getRepository(Investment);
        if (!root.investment) {
            root.investment = await repo.findOne({ institutionAccountId: root.id });
        }
        return root.investment;
    }
}
