import { EntityRepository, Repository } from 'typeorm';
import { GLAccount, GLAccountType } from '../models';
import { GLAccountTypeName } from '../models/GLAccountType';

@EntityRepository(GLAccount)
export class GLAccountRepository extends Repository<GLAccount> {
    async getByType(typeName: GLAccountTypeName): Promise<GLAccount> {
        const accountType = await this.manager.getRepository(GLAccountType).findOne(
            { name: typeName },
            {
                relations: [
                    'glAccounts',
                    'glAccounts.institutionAccount',
                    'glAccounts.tenantAccount'
                ]
            }
        );
        return accountType.glAccounts[0];
    }
}
