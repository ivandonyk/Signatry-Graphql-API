import { Resolver, Ctx, Mutation, Arg } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { largeIdentify } from '../utilities/segmentConfig';

@Resolver()
export class SegmentResolver extends UtilityResolver {
    @Mutation(type => Boolean)
    public async postSegmentEvent(@Ctx() context: GraphQLContext): Promise<boolean> {
        const profile = await this.getCurrentUserProfile(context);

        largeIdentify(context.typeorm.manager, profile.id);

        return true;
    }
}
