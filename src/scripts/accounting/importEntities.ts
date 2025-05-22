import { getOrCreateConnection } from '../../typeorm';
import { LocationEntity, Tenant } from '../../models';
import { AccountingFacade } from '../../accounting';

export async function importEntities() {
    const connection = await getOrCreateConnection();
    const accounting = await new AccountingFacade();
    const tenant = await connection.getRepository(Tenant).findOne();
    const repo = connection.getRepository(LocationEntity);
    const existenceTest = await repo
        .createQueryBuilder('locationEntity')
        .where("locationEntity.locationId = 'X-DAF'")
        .getCount();
    if (existenceTest >= 1) {
        // If X-DAF location already present, skip.
        console.log('Location entities already exist');
        return;
    }
    const entities = await accounting.getAllLocationEntities();
    const inserts = entities.map(entity => {
        return {
            locationId: entity.getLocationId(),
            name: entity.getName(),
            tenantId: tenant.id
        };
    });

    await repo.insert(inserts);
}
