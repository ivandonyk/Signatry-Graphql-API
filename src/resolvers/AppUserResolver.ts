import { AppUser } from '../models/AppUser';
import { UserProfile } from '../models/UserProfile';
import { Resolver, FieldResolver, Ctx, Root, Info } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';

@Resolver(type => AppUser)
export class AppUserResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async userProfile(@Root() root: AppUser, @Ctx() context: any, @Info() info: any) {
        return context.typeorm.getRepository(UserProfile).findOne({
            app_user_id: root.id
        });
    }
}
