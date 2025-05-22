import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInstitutionAccountAddCustodianName1602006674811 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institution_account" ADD COLUMN "custodian_name" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institution_account" DROP COLUMN "custodian_name"`);
    }

}
