import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundFundInvestmentUnits1583382150473 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "total_units"');
        await queryRunner.query('ALTER TABLE "fund_transaction" DROP COLUMN "units"');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund" ADD COLUMN "total_units" FLOAT NOT NULL DEFAULT 0'
        );
        await queryRunner.query(
            'ALTER TABLE "fund_transaction" ADD COLUMN "units" FLOAT NOT NULL DEFAULT 0'
        );
    }
}
