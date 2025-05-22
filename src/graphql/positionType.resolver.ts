import { Resolver, Ctx, Query } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { PositionType } from '../models';

@Resolver(type => PositionType)
export class PositionTypeResolver extends UtilityResolver {
    @Query(type => [PositionType])
    public async allEnabledPositionTypes(@Ctx() context: GraphQLContext): Promise<PositionType[]> {
        return context.typeorm
            .createQueryBuilder(PositionType, 'positionType')
            .where({ enabled: true })
            .getMany();
    }
}
