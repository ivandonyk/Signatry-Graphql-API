import { UserProfileEmail } from '../models/UserProfileEmail';
import { UserProfileEmailOrderBy } from '../inputs/UserProfile/UserProfileEmailOrderBy';

import { UserProfileEmailFilter } from '../inputs/UserProfile/UserProfileEmailFilter';

import { UserProfile } from '../models/UserProfile';
import { UserProfileOrderBy } from '../inputs/UserProfile/UserProfileOrderBy';
import { UserProfileFilter } from '../inputs/UserProfile/UserProfileFilter';
import { Resolver, FieldResolver, Query, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => UserProfileEmail)
export class UserProfileEmailResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async userProfile(
        @Root() root: UserProfileEmail,
        @Ctx() context: any,
        @Info() info: any
    ) {
        const temp = await context.typeorm.getRepository(UserProfile).findOne({
            id: root.userProfileId
        });
        return temp;
    }
}
