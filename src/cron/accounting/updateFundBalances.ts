import { getOrCreateConnection } from '../../typeorm';
import { FundRepository } from '../../repositories/Fund';
import { FundTypeName } from '../../models/FundType';

export async function updateFundBalances() {
    console.log('Updating fund balances');
    const connection = await getOrCreateConnection();
    const fundRepo = connection.getCustomRepository(FundRepository);

    const funds = await fundRepo
        .createQueryBuilder('fund')
        .innerJoinAndSelect('fund.fundType', 'fundType')
        .where('fundType.name = :fundTypeName', { fundTypeName: FundTypeName.DONOR_ADVISED_FUND })
        .getMany();

    let count = 1;
    for (const fund of funds) {
        console.log(`${count} of ${funds.length}`);
        const cashBalance = await fundRepo.getCashBalance(fund);
        const investedBalance = await fundRepo.getInvestedBalance(fund);
        await fundRepo.update(fund.id, {
            cashBalance: cashBalance,
            investedBalance: investedBalance
        });
        count++;
    }

    return;
}
