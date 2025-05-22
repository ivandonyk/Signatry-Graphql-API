import { FundType } from '../models/FundType';
import { Fund } from '../models/Fund';
import { FundOrderBy } from '../inputs/Fund/FundOrderBy';
import { FundFilter } from '../inputs/Fund/FundFilter';
import { Resolver, FieldResolver, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => FundType)
export class FundTypeResolver extends UtilityResolver {
    @FieldResolver(type => [Fund])
    public async funds(
        @Root() root: FundType,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: FundOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundFilter, { nullable: true }) where?: FundFilter
    ) {
        const repo = context.typeorm.getRepository(Fund);
        const builder = this.createQuery(
            repo,
            { ...where, fundTypeId: root.id },
            orderBy,
            skip,
            take
        );
        const result = await builder.getMany();
        return result;
    }
}
