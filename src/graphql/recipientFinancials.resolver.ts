import { Resolver, Ctx, Mutation, Arg } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { RecipientFinancials } from '../models';
import { RecipientFinancialsInput } from '../inputs/RecipientFinancials/RecipientFinancialsInput';

@Resolver(type => RecipientFinancials)
export class RecipientFinancialsResolver extends UtilityResolver {
    @Mutation(type => RecipientFinancials)
    public async updateRecipientFinancials(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: RecipientFinancialsInput
    ): Promise<RecipientFinancials> {
        const { manager } = context.typeorm;
        const {
            id,
            totalAssets,
            totalRevenue,
            totalExpenses,
            irsFilingsLink,
            fullFinancialReportLink
        } = input;

        const financials = await manager.findOne(RecipientFinancials, { id });
        financials.totalRevenue = totalRevenue;
        financials.totalAssets = totalAssets;
        financials.totalExpenses = totalExpenses;
        financials.irsFilingsLink = irsFilingsLink;
        financials.fullFinancialReportLink = fullFinancialReportLink;

        await manager.save(financials);

        return financials;
    }
}
