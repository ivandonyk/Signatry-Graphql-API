import { UserProfilePhone } from '../models/UserProfilePhone';
import { UserProfilePhoneOrderBy } from '../inputs/UserProfile/UserProfilePhoneOrderBy';

import { UserProfilePhoneFilter } from '../inputs/UserProfile/UserProfilePhoneFilter';

import { UserProfile } from '../models/UserProfile';
import { Resolver, FieldResolver, Query, Ctx, Root, Info, Int, Arg } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => UserProfilePhone)
export class UserProfilePhoneResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async userProfile(
        @Root() root: UserProfilePhone,
        @Ctx() context: any,
        @Info() info: any
    ) {
        const temp = await context.typeorm.getRepository(UserProfile).findOne({
            id: root.userProfileId
        });
        return temp;
    }
}
