import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERInvestmentTableAndFundInvestment1585164383697 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment" ADD COLUMN "default_divestment_percentage" double precision NOT NULL DEFAULT 0.00'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_investment" ADD COLUMN "divestment_percentage" double precision NOT NULL DEFAULT 0.00'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_investment" RENAME COLUMN "percentage" TO "allocation_percentage"'
        );
        await queryRunner.query(
            "UPDATE investment SET default_divestment_percentage = 0.5 WHERE name = 'Money Market'"
        );
        await queryRunner.query(
            "UPDATE investment SET default_divestment_percentage = 0.2 WHERE name = 'Conservative Income'"
        );
        await queryRunner.query(
            "UPDATE investment SET default_divestment_percentage = 0.3 WHERE name = 'Capital Preservation Model'"
        );
        await queryRunner.query(
            'UPDATE fund_investment SET divestment_percentage = allocation_percentage'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "investment" DROP COLUMN "default_divestment_percentage"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_investment" DROP COLUMN "divestment_percentage"'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_investment" RENAME COLUMN "allocation_percentage" TO "percentage"'
        );
    }
}
