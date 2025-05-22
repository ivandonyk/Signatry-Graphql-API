import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundInvestmentAddUnits1583383630366 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "fund_investment" ADD COLUMN "units" FLOAT NOT NULL DEFAULT 0'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund_investment" DROP COLUMN "units"');
    }
}
