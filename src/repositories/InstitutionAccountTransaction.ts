import { EntityRepository, Repository } from 'typeorm';

import {
    GLAccount,
    GLAccountReconciliation,
    InstitutionAccount,
    InstitutionAccountTransaction
} from '../models';
import { dayjs } from '../utilities/datetime';

@EntityRepository(InstitutionAccountTransaction)
export class InstitutionAccountTransactionRepository extends Repository<
InstitutionAccountTransaction
> {
    async getUnreconciledTransactions(
        glAccountId: string,
        toDate: Date,
        mockTransactions = true
    ): Promise<InstitutionAccountTransaction[]> {
        const [glAccount, currentReconciliation] = await Promise.all([
            this.manager
                .getRepository(GLAccount)
                .createQueryBuilder('glAccount')
                .innerJoinAndSelect('glAccount.investment', 'investment')
                .leftJoinAndSelect('glAccount.tenantAccount', 'tenantAccount')
                .leftJoinAndSelect('glAccount.institutionAccount', 'institutionAccount')
                .where('glAccount.id = :glAccountId', { glAccountId: glAccountId })
                .andWhere('institutionAccount.isSweepAccount = false')
                .getOne(),
            this.manager
                .getRepository(GLAccountReconciliation)
                .createQueryBuilder('reconciliation')
                .where('reconciliation.glAccountId = :glAccountId', { glAccountId: glAccountId })
                .andWhere('reconciliation.dateReconciled IS NULL')
                .orderBy('reconciliation.datePreviousReconciled', 'DESC')
                .getOne()
        ]);
        const sweepAccount = await this.manager.findOne(InstitutionAccount, {
            institutionAccountId: glAccount.institutionAccount.id
        });
        let where = { field: '', value: '' };
        if (glAccount.institutionAccount) {
            where = { field: 'institutionAccountId', value: glAccount.institutionAccount.id };
        } else if (glAccount.tenantAccount) {
            where = { field: 'tenantAccountId', value: glAccount.tenantAccount.id };
        }

        const repo = this.manager.getRepository(InstitutionAccountTransaction);

        /*
         * Reconciliation start date is for end of business on that day,
         * therefore new transactions should start on the following day
         */
        const startDate = dayjs(currentReconciliation.datePreviousReconciled)
            .add(1, 'day')
            .startOf('date')
            .format('YYYY-MM-DD HH:mm');

        const endDate = dayjs
            .utc(toDate)
            .endOf('date')
            .format('YYYY-MM-DD HH:mm');

        const query = repo
            .createQueryBuilder('entity')
            .leftJoinAndSelect('entity.batch', 'batch')
            .leftJoinAndSelect('entity.holding', 'holding', 'entity.holdingId = holding.id')
            .leftJoinAndSelect('holding.security', 'security', 'holding.securityId = security.id')
            .where(`entity.${where.field} = :accountId`, { accountId: where.value })
            .andWhere('entity.glAccountReconciliationId IS NULL')
            .andWhere('entity.executionDate <= :endDate', { endDate: endDate })
            .orderBy('entity.executionDate')
            .addOrderBy('entity.amount', 'DESC');

        let sweepQuery;
        if (sweepAccount) {
            sweepQuery = repo
                .createQueryBuilder('entity')
                .leftJoinAndSelect('entity.batch', 'batch')
                .where('entity.institutionAccountId = :accountId', {
                    accountId: sweepAccount.id
                })
                .andWhere('entity.glAccountReconciliationId IS NULL')
                .andWhere('entity.executionDate < :endDate', { endDate: endDate })
                .orderBy('entity.executionDate')
                .addOrderBy('entity.amount', 'DESC');

            //If start date is valid then apply conditions on it
            if (startDate && dayjs(startDate).isValid()) {
                sweepQuery.andWhere('entity.executionDate >= :startDate', { startDate: startDate });
            }
        }

        if (process.env.RECONCILIATION_MOCK_TRANSACTIONS == 'true' && mockTransactions) {
            query.andWhere("entity.transactionId LIKE 'MOCK-%'");
        } else {
            query.andWhere("entity.transactionId NOT LIKE 'MOCK-%'");
        }

        if (startDate && dayjs(startDate).isValid()) {
            query.andWhere('entity.executionDate >= :startDate', { startDate: startDate });
        }

        const results = [];
        const accountTransactions = await query.getMany();
        results.push(...accountTransactions);
        if (sweepQuery) {
            const sweepTransactions = await sweepQuery.getMany();
            results.push(...sweepTransactions);
        }

        return results;
    }
}
