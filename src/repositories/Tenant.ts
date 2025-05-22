import { EntityRepository, Repository } from 'typeorm';
import { Tenant } from '../models';

@EntityRepository(Tenant)
export class TenantRepository extends Repository<Tenant> {
    async getSettingByKey(key: string): Promise<any> {
        const tenant = await this.manager.getRepository(Tenant).findOne();
        const settings = tenant.appSetting;
        if (key in settings) {
            return settings[key];
        } else {
            return null;
        }
    }
}
