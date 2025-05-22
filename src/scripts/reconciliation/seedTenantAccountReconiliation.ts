import { GLAccountReconciliation, Investment, TenantAccount } from '../../models';
import { InvestmentType } from '../../models/Investment';
import { PlaidClient } from '../../plaid/client';
import { getOrCreateConnection } from '../../typeorm';

async function seedTenantAccountReconciliation() {
    const plaidClient = new PlaidClient();
    const connection = await getOrCreateConnection();
    const reconciliationRepo = connection.getRepository(GLAccountReconciliation);
    const tenantAccountRepo = connection.getRepository(TenantAccount);
    const investmentRepo = connection.getRepository(Investment);

    const tenantAccounts = await tenantAccountRepo
        .createQueryBuilder('tenantAccount')
        .where('tenantAccount.glAccountId IS NOT NULL')
        .getMany();

    for (const tenantAccount of tenantAccounts) {
        const reconciliation = reconciliationRepo.create({
            glAccountId: tenantAccount.glAccountId,
            datePreviousReconciled: new Date(),
            balanceOpen: 0
        });
        await reconciliationRepo.save(reconciliation);

        const accountData = await plaidClient.getAccount(
            tenantAccount.accountId,
            tenantAccount.accessToken
        );
        await tenantAccountRepo.update(tenantAccount.id, {
            name: accountData.name,
            mask: accountData.mask
        });
    }

    const contributionCashInvestment = await investmentRepo
        .createQueryBuilder('investment')
        .where('investment.investment_type = :investmentType', {
            investmentType: InvestmentType.CONTRIBUTION_CASH
        })
        .getOne();

    await investmentRepo.update(contributionCashInvestment.id, {
        glAccountId: tenantAccounts[0].glAccountId
    });

    process.exit(0);
}

seedTenantAccountReconciliation();
