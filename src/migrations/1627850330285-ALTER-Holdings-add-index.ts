import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERHoldingsAddIndex1627850330285 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Re-create pool holding index to organize by fund investment and date and to include market value
        await queryRunner.query(
            'DROP INDEX IDX_PoolInvestmentHolding_FundInvestmentId'
        );

        await queryRunner.query(
            'CREATE INDEX IDX_PoolInvestmentHolding_FundInvestmentId_Date ON pool_investment_holding (fund_investment_id, date, market_value)'
        );

        // Re-create index on holding to organize by account and date and to include market value
        await queryRunner.query(
            'DROP INDEX IDX_Holding_InstitutionAccountId'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_Holding_InstitutionAccountId_Date ON holding (institution_account_id, date, market_value)'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP INDEX IDX_PoolInvestmentHolding_FundInvestmentId_Date'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_PoolInvestmentHolding_FundInvestmentId ON pool_investment_holding (fund_investment_id)'
        );
        await queryRunner.query(
            'DROP INDEX IDX_Holding_InstitutionAccountId_Date'
        );
        await queryRunner.query(
            'CREATE INDEX IDX_Holding_InstitutionAccountId ON holding (institution_account_id)'
        );
    }

}
