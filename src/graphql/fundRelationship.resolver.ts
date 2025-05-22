import { Resolver, Ctx, Query, FieldResolver, Root } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { FundPermission, FundRelationship, FundRole } from '../models';

@Resolver(type => FundRelationship)
export class FundRelationshipResolver extends UtilityResolver {
    @Query(type => [FundRelationship])
    public async getFundRelationships(@Ctx() context: GraphQLContext): Promise<FundRelationship[]> {
        return context.typeorm
            .createQueryBuilder(FundRelationship, 'fundRelationship')
            .where('fundRelationship.enabled')
            .getMany();
    }
}
