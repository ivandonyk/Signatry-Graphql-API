import { getOrCreateConnection } from '../typeorm';
import { Tenant } from '../models';

export async function healthcheck() {
    const connection = await getOrCreateConnection();
    const tenant = await connection.getRepository(Tenant).findOne();
    return tenant.name;
}
