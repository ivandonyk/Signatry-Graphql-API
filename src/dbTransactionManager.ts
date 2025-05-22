
import { Connection, QueryRunner, EntityManager } from 'typeorm';
import { IsolationLevel } from 'typeorm/driver/types/IsolationLevel';
import { v4 } from 'uuid';
import { getOrCreateConnection } from './typeorm';

const transactions = new WeakMap<TransactionWrapper, DBTransaction>([]);

type DbTransactionStatus = 'pending' | 'started' | 'committed' | 'rolledback'
type TransactionBlock = (em: EntityManager, transactionContext: DbTransactionContext) => Promise<void>

export interface DbTransactionContext {
	readonly id: string
	readonly label: string
	readonly descriptor: string
	readonly state: DbTransactionStatus
	readonly errors: any[]
	log(message?: any, ...optionalParams: any[]): void;
	warn(message?: any, ...optionalParams: any[]): void;
}

export interface TransactionWrapper {
	readonly canBeAssumed: boolean
	readonly label: string
	readonly id: string
	readonly hasTransaction: boolean
	readonly descriptor: string
	join(label: string, block: TransactionBlock): Promise<DbTransactionContext>
	start(isolationLevel?: IsolationLevel): Promise<boolean> // true indicates that this was the effectual (first) call to start
	commit(): Promise<void>
	rollback(): Promise<void>
	awaitCompletion(): Promise<DbTransactionContext>
}

export abstract class AbstractDbTransactionContext implements DbTransactionContext {
	#id = v4()
	#label: string
	state: DbTransactionStatus
	#errors: any[]
	descriptor: string

	constructor(label: string, descriptor: string) {
		this.#label = label
		this.descriptor = descriptor
		this.#errors = []
		this.state = 'pending'
	}

	get id() {
		return this.#id
	}
	
	get label() {
		return this.#label
	}

	get errors() {
		return this.#errors.concat() // ensure the getter doesn't allow mutation and provides a snapshot
	}

	async logState() {
		throw new Error('Not implemented')
	}

	log(message?: any, ...optionalParams: any[]): void {
		console.log(`[DbTransaction ${this.#label}:${this.#id}:${this.descriptor}] ${message}`, ...optionalParams)
	}

	warn(message?: any, ...optionalParams: any[]): void {
		console.warn(`[DbTransaction ${this.#label}:${this.#id}:${this.descriptor}] ${message}`, ...optionalParams)
	}

	addError(error) {
		this.#errors.push(error)
	}
}

class DBTransaction {
	#autoComplete: boolean
	#connection: Connection
	#queryRunner: QueryRunner
	#blocks: TransactionBlock[] = []
	#resolutionPromise: Promise<DbTransactionContext>
	#context: AbstractDbTransactionContext;
	#resolve: (value: DbTransactionContext | PromiseLike<DbTransactionContext>) => void
	
	constructor(connection: Connection, context: AbstractDbTransactionContext, autoComplete = false) {
		this.#autoComplete = autoComplete
		this.#connection = connection
		this.#context = context
		this.#resolutionPromise = new Promise((resolve) => {
			this.#resolve = resolve
		})
	}

	get id() {
		return this.#context.id
	}

	get label() {
		return this.#context.label
	}

	get descriptor() {
		return this.#context.descriptor
	}

	set descriptor(val: string) {
		this.#context.descriptor = val
	}

	get queryRunner() {
		if(!this.#queryRunner) {
			this.#queryRunner = this.#connection.createQueryRunner()
		}

		return this.#queryRunner
	}

	get state() {
		return this.#context.state
	}

	get errors() {
		return this.#context.errors
	}

	get autoComplete() {
		return this.#autoComplete
	}

	set autoComplete(val: boolean) {
		this.#autoComplete = val
	}

	join(label: string, block: TransactionBlock) {
		if(this.state === 'pending') {
			throw new Error('join cannot be called on DbTransaction in the pending state')
		}
		else if(this.state === 'started') {
			this.#blocks.push(block)
			
			// NOTE: DAR all blocks resolve with the transaction status rather than block specific success values or errors
			return new Promise<DbTransactionContext>(resolve => {
				setImmediate(async () => {
						try {
							this.#context.log(`block ${label} starting`)
							await block(this.queryRunner.manager, this.#context)
							await this._resolveBlock(block, label)
							resolve(this.#context)
					} catch (err) {
							await this._resolveBlock(block, label, err)
							resolve(this.#context)
					}
				})
			})
		}
		else {
			return this.#resolutionPromise;
		}
	}

	async _resolveBlock(block:TransactionBlock, label: string, err?) {
		const index = this.#blocks.indexOf(block)

		if(index !== -1) {
			this.#blocks.splice(index, 1)

			if(err) {
				this.#context.addError(err);
				this.#context.warn(`block ${label} failed: ${err}`)
			}
			else {
				this.#context.log(`block ${label} succeeded`)
			}

			if(this.#autoComplete && this.#blocks.length === 0) {
				if(this.errors.length === 0) {
					await this.commit();
				}
				else {
					await this.rollback();
				}
			}
		}
		else {
			// this should not happen
			this.#context.warn(`Attempt to resolve an untracked transaction block ${label}`)
		}
	}

	async awaitCompletion() {
		return this.#resolutionPromise
	}

	async start(isolationLevel?: IsolationLevel) {
		if(this.state === 'pending') {
			this.#context.state = 'started'
			await this.queryRunner.startTransaction(isolationLevel)
			await this.#context.logState()
			return true;
		}
		return false;
	}

	async commit() {
		if(this.state === 'started') {
			this.#context.state = 'committed'
			await this.queryRunner.commitTransaction()
			await this.#context.logState()
			await this._release()
		}
	}

	async rollback() {
		if(this.state === 'started') {
			this.#context.state = 'rolledback'
			await this.queryRunner.rollbackTransaction()
			await this.#context.logState()
			await this._release()
		}
	}

	private async _release() {
		try {
			if(this.#queryRunner) {
				await this.#queryRunner.release()
			}
		}
		finally {
			this.#resolve(this.#context)
		}
	}
}

class DbTransactionWrapper implements TransactionWrapper {
	
	#canBeAssumed: boolean
	#label: string
	#descriptor: string

	constructor({label = undefined, descriptor, canBeAssumed = false }: {label?: string, descriptor: string, canBeAssumed:boolean} ) {
		this.#canBeAssumed = canBeAssumed
		this.#label = label
		this.#descriptor = descriptor
	}

	get canBeAssumed() {
		return this.#canBeAssumed
	}

	get descriptor() {
		return this.#descriptor
	}

	get id() {
		const tran = transactions.get(this)
		
		return tran && tran.id
	}

	get label() {
		return this.#label
	}

	get hasTransaction() {
		const tran = transactions.get(this)

		return !!tran;
	}

	async start(isolationlevel?: IsolationLevel) {
		const tran = transactions.get(this)

		if(tran && tran.state === 'pending') {
			
			return await tran.start(isolationlevel)
		}
		return false;
	}

	async join(label: string, block: TransactionBlock) {
		const tran = transactions.get(this)

		if(!tran) {
			throw new Error(`Cannot add block to ${this.label}:${this.descriptor}. Another process may have assumed ownership.`)
		}

		return await tran.join(label, block);
	}

	async commit() {
		const tran = transactions.get(this)

		if(tran) {
			if(tran.state === 'started') {
				await tran.commit()
			}
		}
		else {
			console.log(`Attempt to commit ${this.label}:${this.descriptor} which no longer has an associated DBTransaction. Another process may have assumed ownership.`)
		}
	}

	async rollback() {
		const tran = transactions.get(this)

		if(tran) {
			if(tran.state === 'started') {
				await tran.rollback()
			}
		}
		else {
			console.log(`Attempt to rollback ${this.label}:${this.descriptor} which no longer has an associated DBTransaction. Another process may have assumed ownership.`)
		}
	}

	async awaitCompletion() {
		const tran = transactions.get(this)

		if(!tran) {
			throw new Error(`Cannot await completion of ${this.label}:${this.descriptor}. Another process may have assumed ownership.`)
		}

		return await tran.awaitCompletion();
	}
}

export async function createTransaction({ connection, canBeAssumed, autoComplete, context } : { connection?: Connection, canBeAssumed?: boolean, autoComplete?: boolean, context: AbstractDbTransactionContext }): Promise<TransactionWrapper> {
	const con = connection || await getOrCreateConnection()
	const wrapper = new DbTransactionWrapper({label: context.label, descriptor: context.descriptor, canBeAssumed})
	const tran = new DBTransaction(con, context, autoComplete)

  transactions.set(wrapper, tran)

  return wrapper;
}

export function assumeOwnership(wrapper: TransactionWrapper, newDescriptor: string, canBeAssumed: boolean = undefined, autoComplete?: boolean): TransactionWrapper {
	if(!wrapper.canBeAssumed) {
		throw new Error(`${wrapper.label}:${wrapper.id}:${wrapper.descriptor} does not allow assumption of ownership.`)
	}

	const tran = transactions.get(wrapper)

	if(!tran) {
		throw new Error(`Cannot assume ownership of ${wrapper.label}:${wrapper.descriptor}. Another process may have assumed ownership.`)
	}
	else if(tran.state !== 'pending' && tran.state !== 'started') {
		throw new Error(`Cannot assume ownership of ${wrapper.label}:${wrapper.descriptor} because its state is ${tran.state}.`)
	}

	if(autoComplete !== undefined) {
		tran.autoComplete = autoComplete
	}

	tran.descriptor = newDescriptor

	const assumedWrapper = new DbTransactionWrapper({ label: wrapper.label, descriptor: newDescriptor, canBeAssumed: canBeAssumed === undefined? wrapper.canBeAssumed: canBeAssumed })

	transactions.delete(wrapper)
	transactions.set(assumedWrapper, tran)

	return assumedWrapper
}