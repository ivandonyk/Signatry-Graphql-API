import { Investment, InvestmentType } from '../models/Investment';
import { InvestmentOrderBy } from '../inputs/Investment/InvestmentOrderBy';

import { InvestmentFilter } from '../inputs/Investment/InvestmentFilter';

import { InstitutionAccount } from '../models/InstitutionAccount';
import { UserProfile } from '../models/UserProfile';
import { FundInvestment } from '../models/FundInvestment';
import { InvestmentUnitPriceHistory } from '../models/InvestmentUnitPriceHistory';
import { UserProfileOrderBy } from '../inputs/UserProfile/UserProfileOrderBy';
import { FundInvestmentOrderBy } from '../inputs/FundInvestment/FundInvestmentOrderBy';
import { InvestmentUnitPriceHistoryOrderBy } from '../inputs/InvestmentUnitPriceHistory/InvestmentUnitPriceHistoryOrderBy';
import { UserProfileFilter } from '../inputs/UserProfile/UserProfileFilter';
import { FundInvestmentFilter } from '../inputs/FundInvestment/FundInvestmentFilter';
import { InvestmentUnitPriceHistoryFilter } from '../inputs/InvestmentUnitPriceHistory/InvestmentUnitPriceHistoryFilter';
import { Resolver, FieldResolver, Query, Float, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { GLAccount } from '../models';

@Resolver(type => Investment)
export class InvestmentResolver extends UtilityResolver {
    @FieldResolver(type => Float, { nullable: true })
    async currentUnitPrice(
        @Ctx() context: GraphQLContext,
        @Root() root: Investment
    ): Promise<number> {
        const current = await context.typeorm.manager
            .getRepository(InvestmentUnitPriceHistory)
            .findOne({
                where: { investmentId: root.id },
                order: { createdOn: 'DESC' }
            });

        return current ? current.closePrice : null;
    }

    @FieldResolver(type => [FundInvestment])
    public async fundAllocations(
        @Root() root: Investment,
        @Ctx() context: any,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: FundInvestmentOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundInvestmentFilter, {
            nullable: true
        })
        where?: FundInvestmentFilter
    ) {
        const repo = context.typeorm.getRepository(FundInvestment);
        const builder = this.createQuery(
            repo,
            { ...where, investmentId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    @FieldResolver(type => [InvestmentUnitPriceHistory])
    public async unitPriceHistory(
        @Root() root: Investment,
        @Ctx() context: any,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: InvestmentUnitPriceHistoryOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => InvestmentUnitPriceHistoryFilter, { nullable: true })
        where?: InvestmentUnitPriceHistoryFilter
    ) {
        const repo = context.typeorm.getRepository(InvestmentUnitPriceHistory);
        const builder = this.createQuery(
            repo,
            { ...where, investmentId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }

    @FieldResolver(type => InstitutionAccount)
    public async institutionAccount(
        @Ctx() context: GraphQLContext,
        @Root() root: Investment
    ): Promise<InstitutionAccount> {
        const repo = context.typeorm.getRepository(InstitutionAccount);
        if (!root.institutionAccount) {
            root.institutionAccount = await repo.findOne({ id: root.institutionAccountId });
        }
        return root.institutionAccount;
    }

    @FieldResolver(type => GLAccount)
    public async glAccount(
        @Ctx() context: GraphQLContext,
        @Root() root: Investment
    ): Promise<GLAccount> {
        const repo = context.typeorm.getRepository(GLAccount);
        if (!root.glAccount) {
            root.glAccount = await repo.findOne({ id: root.glAccountId });
        }
        return root.glAccount;
    }
}
