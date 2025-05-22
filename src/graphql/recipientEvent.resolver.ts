import { RecipientEvent } from './../models/RecipientEvent';
import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { BaseResolver } from './core/BaseResolver';
import { GraphQLContext } from '../context';

@Resolver()
export class RecipientEventResolver extends BaseResolver {
    @Query(type => [RecipientEvent])
    async getRecipientEvents(
        @Ctx() context: GraphQLContext,
        @Arg('recipientId') recipientId: string
    ): Promise<RecipientEvent[]> {
        const query = context.typeorm
            .createQueryBuilder(RecipientEvent, 'event')
            .where('event.recipientId = :recipientId', { recipientId })
            .orderBy('event.createdOn', 'ASC');

        return query.getMany();
    }
}
