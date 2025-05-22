import { Resolver, Ctx, Mutation, Arg } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';
import { Cause } from '../models';
import { CreateCauseInput } from '../inputs/Cause/CreateCauseInput';

@Resolver(type => Cause)
export class CauseResolver extends UtilityResolver {
    @Mutation(type => Cause)
    async createCause(
        @Ctx() context: GraphQLContext,
        @Arg('input') input: CreateCauseInput
    ): Promise<Cause> {
        const { manager } = context.typeorm;
        const profile = await this.getCurrentUserProfile(context);

        const existing = await manager.getRepository(Cause).findOne({ name: input.name });

        if (existing) return existing;

        const cause = manager.create(Cause, { ...input, createdBy: profile.id });

        return manager.save(cause);
    }
}
