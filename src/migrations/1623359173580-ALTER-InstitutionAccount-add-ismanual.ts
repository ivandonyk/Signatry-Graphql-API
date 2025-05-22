import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInstitutionAccountAddIsmanual1623359173580 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE institution_account ADD COLUMN is_manual boolean DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE institution_account DROP COLUMN is_manual`);
    }

}
