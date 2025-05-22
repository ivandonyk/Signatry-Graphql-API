import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInstitutionAccountAddAddress1623365562260 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE institution_account ADD COLUMN address_line1 character varying`);
        await queryRunner.query(`ALTER TABLE institution_account ADD COLUMN address_line2 character varying`);
        await queryRunner.query(`ALTER TABLE institution_account ADD COLUMN address_city character varying`);
        await queryRunner.query(`ALTER TABLE institution_account ADD COLUMN address_zip character varying`);
        await queryRunner.query(`ALTER TABLE institution_account ADD COLUMN address_state character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE institution_account DROP COLUMN address_line_1`)
        await queryRunner.query(`ALTER TABLE institution_account DROP COLUMN address_line_2`)
        await queryRunner.query(`ALTER TABLE institution_account DROP COLUMN address_city`)
        await queryRunner.query(`ALTER TABLE institution_account DROP COLUMN address_zip`)
        await queryRunner.query(`ALTER TABLE institution_account DROP COLUMN address_state`)
    }

}
