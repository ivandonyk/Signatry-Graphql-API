import { UserProfileAddress } from '../models/UserProfileAddress';
import { UserProfileAddressOrderBy } from '../inputs/UserProfile/UserProfileAddressOrderBy';

import { UserProfileAddressFilter } from '../inputs/UserProfile/UserProfileAddressFilter';

import { UserProfile } from '../models/UserProfile';
import { UserProfileOrderBy } from '../inputs/UserProfile/UserProfileOrderBy';
import { UserProfileFilter } from '../inputs/UserProfile/UserProfileFilter';
import { Resolver, FieldResolver, Query, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => UserProfileAddress)
export class UserProfileAddressResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async userProfile(
        @Root() root: UserProfileAddress,
        @Ctx() context: any,
        @Info() info: any
    ) {
        const temp = await context.typeorm.getRepository(UserProfile).findOne({
            id: root.userProfileId
        });
        return temp;
    }
}
