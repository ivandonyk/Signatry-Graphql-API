import { Recipient, RecipientBoardOfDirectorsMember } from '../models';
import { Resolver, FieldResolver, Query, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => RecipientBoardOfDirectorsMember)
export class RecipientBoardOfDirectorsMemberResolver extends UtilityResolver {
    // Primary recipient contact address
    @FieldResolver(type => Recipient)
    public async recipient(
        @Root() { recipientId }: RecipientBoardOfDirectorsMember,
        @Ctx() context: GraphQLContext
    ) {
        const repo = context.typeorm.getRepository(Recipient);
        return repo.find({
            id: recipientId
        });
    }
}
