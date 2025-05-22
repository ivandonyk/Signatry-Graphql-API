import { Connection, EntityManager } from 'typeorm';
import { EmailService } from './sendgrid';
import { DbTransactionContext, TransactionWrapper } from './dbTransactionManager';

export interface RequestTransactionContext {
    // add ability to join a request bound transaction
    joinTransaction(
        label: string,
        block: (em: EntityManager, context: DbTransactionContext) => Promise<void>
    ): Promise<DbTransactionContext>;
    assumeTransactionOwnership(
        descriptor: string,
        canBeAssumed?: boolean,
        autoComplete?: boolean
    ): TransactionWrapper;
}

export interface GraphQLContext extends RequestTransactionContext {
    typeorm: Connection;
    user: any;
    email: EmailService;
    headers: any;
}
