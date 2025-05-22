import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundInvestmentTable1582648479273 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_investment_pool_allocation" RENAME TO "fund_investment"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_investment" RENAME "investment_pool_id" TO "investment_id"'
        );
        await queryRunner.query('ALTER TABLE "fund_investment" ADD COLUMN "created_by" uuid NULL');
        await queryRunner.query('ALTER TABLE "fund_investment" ADD COLUMN "updated_by" uuid NULL');
        await queryRunner.query(
            'ALTER TABLE "fund_investment" ADD "enabled" boolean NOT NULL DEFAULT true'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund_investment" DROP COLUMN "enabled"');
        await queryRunner.query('ALTER TABLE "fund_investment" DROP COLUMN "updated_by"');
        await queryRunner.query('ALTER TABLE "fund_investment" DROP COLUMN "created_by"');
        await queryRunner.query(
            'ALTER TABLE "fund_investment" RENAME "investment_id" TO "investment_pool_id"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_investment" RENAME TO "fund_investment_pool_allocation"'
        );
    }
}
