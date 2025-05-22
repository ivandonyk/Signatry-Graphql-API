import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { BaseResolver } from './core/BaseResolver';
import { GraphQLContext } from '../context';
import { TransactionEvent, EventNameValue } from '../models/TransactionEvent';

@Resolver()
export class TransactionProcessedEventResolver extends BaseResolver {
    @Query(type => [TransactionEvent])
    async getTransactionProcessedEventsByTransactionId(
        @Ctx() context: GraphQLContext,
        @Arg('fundTransactionId') fundTransactionId: string
    ): Promise<TransactionEvent[]> {
        const query = context.typeorm
            .createQueryBuilder(TransactionEvent, 'event')
            .select(['event.id', 'event.name', 'event.createdOn'])
            .where('event.fundTransactionId = :fundTransactionId', { fundTransactionId })
            .andWhere('event.parentEventId IS NULL and event.name= :eventName', {
                eventName: EventNameValue.PROCESSED
            });
        return query.getMany();
    }
}
