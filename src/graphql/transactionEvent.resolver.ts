import { Arg, Ctx, Query, Resolver } from 'type-graphql';
import { BaseResolver } from './core/BaseResolver';
import { GraphQLContext } from '../context';
import { TransactionEvent } from '../models/TransactionEvent';
import { PermissionLock } from '../decorators/permissionDecorator';
import { PermissionAccessLevel, PermissionAccessType } from '../models/Permission';

@Resolver()
export class TransactionEventResolver extends BaseResolver {
    @PermissionLock(PermissionAccessType.ADMIN_GRANTS, PermissionAccessLevel.READ)
    @Query(type => [TransactionEvent])
    async getMajorTransactionEventsByTransactionId(
        @Ctx() context: GraphQLContext,
        @Arg('fundTransactionId') fundTransactionId: string
    ): Promise<TransactionEvent[]> {
        const query = context.typeorm
            .createQueryBuilder(TransactionEvent, 'event')
            .leftJoinAndSelect('event.fundTransaction', 'transaction')
            .where('transaction.id = :fundTransactionId', { fundTransactionId })
            .andWhere('event.parentEventId IS NULL ');
        return query.getMany();
    }
}
