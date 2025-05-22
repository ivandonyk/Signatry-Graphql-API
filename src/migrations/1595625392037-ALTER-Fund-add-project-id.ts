import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFundAddProjectId1595625392037 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fund" ADD COLUMN "accounting_project_id" character varying`);
        await queryRunner.query(`ALTER TABLE "user_profile" ADD COLUMN "accounting_customer_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fund" DROP COLUMN "accounting_project_id"`);
        await queryRunner.query(`ALTER TABLE "user_profile" DROP COLUMN "accounting_customer_id"`);
    }
}
