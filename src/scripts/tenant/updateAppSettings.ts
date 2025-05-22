import { getOrCreateConnection } from '../../typeorm';

import { Tenant } from '../../models';
import { TenantSettings } from '../../models/TenantSettings';

(async () => {
    const connection = await getOrCreateConnection({ logging: false });
    const repo = connection.getRepository(Tenant);

    const where = { name: 'The Signatry' };

    const tenant = await repo.findOne(where);

    const newValues = {
        tenantLegalName: 'Servant Foundation',
        ein: '431890105',
        tenantName: 'SIGNATRY'
    };

    const appSetting: TenantSettings = Object.assign(tenant.appSetting, newValues);

    console.log('updating app settings with the following: \n', newValues);
    await repo
        .createQueryBuilder()
        .update()
        .set({ appSetting })
        .where(where)
        .execute();

    process.exit(0);
})();
