import { Person } from '../models/Person';
import { Fund } from '../models/Fund';
import { FundOrderBy } from '../inputs/Fund/FundOrderBy';
import { FundFilter } from '../inputs/Fund/FundFilter';
import { Resolver, FieldResolver, Query, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => Person)
export class PersonResolver extends UtilityResolver {
    @FieldResolver(type => [Fund])
    public async funds(
        @Root() root: Person,
        @Ctx() context: GraphQLContext,
        @Info() info: any,
        @Arg('orderBy', { nullable: true })
        orderBy?: FundOrderBy,
        @Arg('skip', type => Int, { nullable: true }) skip?: number,
        @Arg('take', type => Int, { nullable: true }) take?: number,
        @Arg('where', type => FundFilter, {
            nullable: true
        })
        where?: FundFilter
    ) {
        const repo = context.typeorm.getRepository(Fund);
        const builder = repo
            .createQueryBuilder('fund')
            .leftJoin('fund.fundUserProfiles', 'fundUserProfile')
            .where('fundUserProfile.userProfileId = :id', { id: root.userProfileId });
        const result = await builder.getMany();
        return result;
    }
}
