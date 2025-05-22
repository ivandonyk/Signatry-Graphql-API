import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInstitutionAccountLastUpdatedNullable1602522416121 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE "institution_account" ALTER COLUMN "last_updated" DROP NOT NULL`);
        queryRunner.query(`ALTER TABLE "institution_account" ALTER COLUMN "account_type" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`ALTER TABLE "institution_account" ALTER COLUMN "last_updated" SET NOT NULL`);
        queryRunner.query(`ALTER TABLE "institution_account" ALTER COLUMN "account_type" SET NOT NULL`);
    }
}
