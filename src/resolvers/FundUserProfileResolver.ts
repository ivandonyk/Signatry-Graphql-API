import { FundUserProfile } from '../models/FundUserProfile';
import { UserProfile } from '../models/UserProfile';
import { Fund } from '../models/Fund';
import { FundRole } from '../models/FundRole';
import { Resolver, FieldResolver, Ctx, Root, Info } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';
import { FundRelationship } from '../models';

@Resolver(type => FundUserProfile)
export class FundUserProfileResolver extends UtilityResolver {
    @FieldResolver(type => UserProfile)
    public async user(
        @Root() root: FundUserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const temp = await context.typeorm.getRepository(UserProfile).findOne({
            id: root.userProfileId
        });
        return temp;
    }

    @FieldResolver(type => Fund)
    public async fund(
        @Root() root: FundUserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const temp = await context.typeorm.getRepository(Fund).findOne({
            id: root.fundId
        });
        return temp;
    }

    @FieldResolver(type => FundRole)
    public async fundRole(
        @Root() root: FundUserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const temp = await context.typeorm.getRepository(FundRole).findOne({
            id: root.fundRoleId
        });
        return temp;
    }

    @FieldResolver(type => FundRelationship, { nullable: true })
    public async fundRelationship(
        @Root() root: FundUserProfile,
        @Ctx() context: GraphQLContext,
        @Info() info: any
    ) {
        const temp = await context.typeorm.getRepository(FundRelationship).findOne({
            id: root.fundRelationshipId
        });
        return temp;
    }
}
