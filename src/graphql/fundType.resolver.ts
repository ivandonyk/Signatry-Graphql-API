import { FundType } from '../models/FundType';
import { FundTypeOrderBy } from '../inputs/FundType/FundTypeOrderBy';
import { FundTypeFilter } from '../inputs/FundType/FundTypeFilter';
import { Resolver, Query, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from './core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => FundType)
export class FundTypeResolver extends UtilityResolver {
    @Query(type => [FundType])
    public async fundTypes(
        @Root() root: FundType,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true }) orderBy?: FundTypeOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundTypeFilter, { nullable: true })
        where?: FundTypeFilter
    ): Promise<FundType[]> {
        const repo = context.typeorm.getRepository(FundType);
        const query = this.createQuery(repo, where, orderBy, skip, take);
        const result = await query.getMany();
        return result;
    }

    @Query(type => Int)
    public async fundTypesCount(
        @Root() root: FundType,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('where', type => FundTypeFilter, { nullable: true })
        where?: FundTypeFilter
    ): Promise<number> {
        const repo = context.typeorm.getRepository(FundType);
        const query = this.createQuery(repo, where);
        const result = await query.getCount();
        return result;
    }
}
