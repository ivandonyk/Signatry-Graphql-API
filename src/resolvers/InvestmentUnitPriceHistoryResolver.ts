import { InvestmentUnitPriceHistory } from '../models/InvestmentUnitPriceHistory';
import { UserProfile } from '../models';
import { Investment } from '../models/Investment';
import { Resolver, FieldResolver, Ctx, Root, Info } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => InvestmentUnitPriceHistory)
export class InvestmentUnitPriceHistoryResolver extends UtilityResolver {
    @FieldResolver(type => Investment)
    public async investment(
        @Root() root: InvestmentUnitPriceHistory,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const temp = await context.typeorm.getRepository(Investment).findOne({
            id: root.investmentId
        });
        return temp;
    }

    @FieldResolver(type => UserProfile)
    public async createdByUserProfile(
        @Root() root: InvestmentUnitPriceHistory,
        @Ctx() context: GraphQLContext
    ) {
        const temp = await context.typeorm.getRepository(UserProfile).findOne({
            id: root.createdBy
        });
        return temp;
    }
}
