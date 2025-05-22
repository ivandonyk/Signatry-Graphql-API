import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFundTransactionAddIshistoric1626110792684 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE fund_transaction ADD COLUMN is_historic boolean DEFAULT false');
        await queryRunner.query('ALTER TABLE fund_transaction ADD COLUMN historic_imported_on timestamp');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE fund_transaction DROP COLUMN is_historic');
        await queryRunner.query('ALTER TABLE fund_transaction DROP COLUMN history_imported_on');
    }

}
