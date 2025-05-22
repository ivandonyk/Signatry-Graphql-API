import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInstitutionAccountTransactionAddExecutionDate1623361813275 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE institution_account_transaction ADD COLUMN execution_date timestamp`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE institution_account_transaction DROP COLUMN`);
    }

}
