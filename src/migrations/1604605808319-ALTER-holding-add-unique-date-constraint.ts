import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERHoldingAddUniqueDateConstraint1604605808319 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "holding" ADD CONSTRAINT "UNQ_HoldingIdDate" UNIQUE ("holding_id", "date")'
        );
        await queryRunner.query(
            'ALTER TABLE "pool_investment_holding" ADD CONSTRAINT "UNQ_FundInvestmentIdDate" UNIQUE ("fund_investment_id", "date")'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "holding" DROP CONSTRAINT "UNQ_HoldingIdDate"');
        await queryRunner.query(
            'ALTER TABLE "pool_investment_holding" DROP CONSTRAINT "UNQ_FundInvestmentIdDate"'
        );
    }
}
