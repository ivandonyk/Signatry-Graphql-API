import { EntityRepository, Repository } from 'typeorm';
import { LocationEntity } from '../models';

@EntityRepository(LocationEntity)
export class LocationEntityRepository extends Repository<LocationEntity> {
    async getDAFLocationEntity(): Promise<LocationEntity> {
        const locationEntity = await this.manager
            .getRepository(LocationEntity)
            .findOne({ locationId: 'X-DAF' });
        return locationEntity;
    }
}
