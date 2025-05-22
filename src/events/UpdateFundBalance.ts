import { getOrCreateConnection } from '../typeorm';
import { FundRepository } from '../repositories/Fund';

export async function UpdateFundBalanceListener(fundId: string) {
    const connection = await getOrCreateConnection();

    const fundRepo = connection.getCustomRepository(FundRepository);

    const fund = await fundRepo.findOne(fundId);
    const cashBalance = await fundRepo.getCashBalance(fund);
    const investedBalance = await fundRepo.getInvestedBalance(fund);

    await fundRepo.update(fundId, {
        cashBalance: cashBalance,
        investedBalance: investedBalance
    });
}
