import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInvestmentUnitPriceHistoryAddTotalUnits1628716962616 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE investment_unit_price_history ADD COLUMN total_units NUMERIC');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE investment_unit_price_history DROP COLUMN total_units');
    }

}
