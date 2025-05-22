import { EntityRepository, Repository } from 'typeorm';
import { FundInvestment } from '../models';
import { InvestmentType } from '../models/Investment';

@EntityRepository(FundInvestment)
export class FundInvestmentRepository extends Repository<FundInvestment> {
    async getGrantCashInvestmentForFund(fundId: string): Promise<FundInvestment> {
        const fundInvestment = await this.manager
            .createQueryBuilder(FundInvestment, 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .where('investment.investmentType = :investmentType', {
                investmentType: InvestmentType.GRANT_CASH
            })
            .andWhere('fundInvestment.fundId = :fundId', { fundId: fundId })
            .getOne();
        return fundInvestment;
    }

    async getContributionCashInvestmentForFund(fundId: string): Promise<FundInvestment> {
        const fundInvestment = await this.manager
            .createQueryBuilder(FundInvestment, 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .where('investment.investmentType = :investmentType', {
                investmentType: InvestmentType.CONTRIBUTION_CASH
            })
            .andWhere('fundInvestment.fundId = :fundId', { fundId: fundId })
            .getOne();
        return fundInvestment;
    }

    async getStockInvestmentForFund(fundId: string): Promise<FundInvestment> {
        const fundInvestment = await this.manager
            .createQueryBuilder(FundInvestment, 'fundInvestment')
            .leftJoinAndSelect('fundInvestment.investment', 'investment')
            .where('investment.investmentType = :investmentType', {
                investmentType: InvestmentType.SHARED_STOCK
            })
            .andWhere('fundInvestment.fundId = :fundId', { fundId: fundId })
            .getOne();
        return fundInvestment;
    }

    async getFundInvestmentForFundByGLAccount(
        fundId: string,
        glAccountId: string
    ): Promise<FundInvestment> {
        const fundInvestment = await this.createQueryBuilder('fundInvestment')
            .innerJoinAndSelect('fundInvestment.investment', 'investment')
            .where('fundInvestment.fundId = :fundId', { fundId: fundId })
            .andWhere('investment.glAccountId = :glAccountId', { glAccountId: glAccountId })
            .getOne();
        return fundInvestment;
    }
}
