import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInvestmentAddMarketvalue1602885596782 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE "investment" ADD COLUMN "market_value" float`);
        queryRunner.query(`ALTER TABLE "investment" ADD COLUMN "market_value_as_of" timestamp`);
        queryRunner.query(`ALTER TABLE "investment" ADD COLUMN "total_units" float`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE "investment" DROP COLUMN "market_value"`);
        queryRunner.query(`ALTER TABLE "investment" DROP COLUMN "market_value_as_of"`);
        queryRunner.query(`ALTER TABLE "investment" DROP COLUMN "total_units"`);
    }
}
