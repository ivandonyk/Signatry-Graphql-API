import { EntityRepository, Repository } from 'typeorm';
import { FundRole, FundRoleNameValues } from '../models/FundRole';

@EntityRepository(FundRole)
export class FundRoleRepository extends Repository<FundRole> {
    async getByName(name: FundRoleNameValues): Promise<FundRole> {
        const fundRole = await this.manager.getRepository(FundRole).findOne({ name: name });
        return fundRole;
    }
}
