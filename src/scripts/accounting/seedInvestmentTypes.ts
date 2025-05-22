import { getOrCreateConnection } from '../../typeorm';
import { In } from 'typeorm';
import { Investment, InvestmentType } from '../../models/Investment';

export async function seedInvestmentTypes() {
    const connection = await getOrCreateConnection();
    const investmentRepo = await connection.getRepository(Investment);
    const poolNames = [
        'Aggressive Growth',
        'Conservative Income',
        'Money Market',
        'Capital Preservation Model',
        'Income and Growth'
    ];

    const poolInvestments = await investmentRepo.update(
        { name: In(poolNames) },
        { investmentType: InvestmentType.POOL }
    );
    console.log('Set pool investments to type POOL');
}
seedInvestmentTypes();
