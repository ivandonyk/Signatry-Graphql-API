import { EntityManager } from 'typeorm';
import { Cause } from '../models';

export async function getCauseByCode(manager: EntityManager, code: string): Promise<Cause> {
    return manager.getRepository(Cause).findOne({ primaryCode: code });
}
