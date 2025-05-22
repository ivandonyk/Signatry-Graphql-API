import { updateSharedHoldings } from '../../cron/accounting/updateHoldings';
import { Investment, InvestmentUnitPriceHistory } from '../../models';
import { InvestmentType } from '../../models/Investment';
import { getOrCreateConnection } from '../../typeorm';

export async function resetUnitPrices() {
    console.log('Resetting unit prices to $1 per share');

    const connection = await getOrCreateConnection();

    const investmentRepo = connection.getRepository(Investment);
    const unitPriceRepo = connection.getRepository(InvestmentUnitPriceHistory);

    const pooledInvestments = await investmentRepo
        .createQueryBuilder('investment')
        .leftJoinAndSelect('investment.institutionAccount', 'institutionAccount')
        .where('investment.investmentType = :investmentType', {
            investmentType: InvestmentType.POOL
        })
        .getMany();

    for (const pool of pooledInvestments) {
        await investmentRepo.update(pool.id, { totalUnits: pool.institutionAccount.marketValue });
        await unitPriceRepo.insert({
            investmentId: pool.id,
            closePrice: 1,
            closePriceAsOf: new Date(),
            previousPrice: 1
        });
    }

    await updateSharedHoldings();
}
