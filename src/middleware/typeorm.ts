import { Application, NextFunction } from 'express';
import { Connection, EntityManager } from 'typeorm';
import { Request, Response } from '../types/Http';
import { getOrCreateConnection } from '../typeorm';
import { createTransaction, assumeOwnership, AbstractDbTransactionContext, DbTransactionContext } from '../dbTransactionManager';
import { DbTransactionLog } from '../models/DbTransactionLog';

class TypeOrmDbTransactionContext extends AbstractDbTransactionContext {
    #connection: Connection
    #createdBySub: string

    constructor(label: string, descriptor: string, connection: Connection, createdBySub: string) {
        super(label, descriptor)

        this.#connection = connection
        this.#createdBySub = createdBySub
    }

    async logState() {
        this.log(`State set to ${this.state}`)

        try {
            const errors = this.errors
            const repo = this.#connection.getRepository(DbTransactionLog)
            const entity = repo.create({ dbTransactionId: this.id, state: this.state, createdBy: this.#createdBySub, descriptor: this.descriptor, firstError: errors.length? `${errors[0]}`: undefined })

            await repo.insert(entity);
        }
        catch (err) {
            this.warn('Failed to persist state')
        }
    }
}

export async function addTypeOrmMiddleware(app: Application) {
    const connection: Connection = await getOrCreateConnection();

    app.use(async (req: Request, res: Response, next: NextFunction) => {
        // this is a transaction wrapper that will autoComplete when all transacted blocks resolve. code within the request can assume ownership of the transaction to override the autoCompletion behavior, etc.
        const tranContext = new TypeOrmDbTransactionContext('RequestTran', 'typeOrmMiddleware.ambient', connection, (req as any).user?.sub)
        let sharedTransaction = await createTransaction({
            connection,
            autoComplete: true,
            canBeAssumed: true,
            context: tranContext
        });

        req.typeorm = connection;
        req.joinTransaction = async (
            label: string,
            block: (em: EntityManager, context: DbTransactionContext) => Promise<void>
        ) => {
            const isRootBlock = await sharedTransaction.start();
            const blockPromise = sharedTransaction.join(label, block);

            if (isRootBlock) {
                return sharedTransaction.awaitCompletion();
            } else {
                return blockPromise;
            }
        };

        req.assumeTransactionOwnership = (
            descriptor: string,
            canBeAssumed?: boolean,
            autoComplete?: boolean
        ) => {
            sharedTransaction = assumeOwnership(
                sharedTransaction,
                descriptor,
                canBeAssumed,
                autoComplete
            );

            return sharedTransaction;
        };

        next();
    });
}
