import { EntityRepository, Repository, ObjectLiteral } from 'typeorm';
import { Security } from '../models';

@EntityRepository(Security)
export class SecurityRepository extends Repository<Security> {
    async getCashBalanceSecurityForAccount(institutionAccountId: string): Promise<Security> {
        return await this.createQueryBuilder('security')
            .innerJoin('security.holdings', 'holdings')
            .where('holdings.institutionAccountId = :institutionAccountId', {
                institutionAccountId: institutionAccountId
            })
            .andWhere("security.securityType = 'CASH'")
            .getOne();
    }
}
