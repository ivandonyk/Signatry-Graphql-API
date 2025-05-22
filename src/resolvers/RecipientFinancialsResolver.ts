import { Recipient, RecipientFinancials } from '../models';
import { Resolver, FieldResolver, Query, Ctx, Root } from 'type-graphql';
import { UtilityResolver } from '../graphql/core/UtilityResolver';
import { GraphQLContext } from '../context';

@Resolver(type => RecipientFinancials)
export class RecipientBoardOfDirectorsMemberResolver extends UtilityResolver {
    // Primary recipient contact address
    @FieldResolver(type => Recipient)
    public async recipient(
        @Root() { recipientId }: RecipientFinancials,
        @Ctx() context: GraphQLContext
    ) {
        const repo = context.typeorm.getRepository(Recipient);
        return repo.find({
            id: recipientId
        });
    }
}
