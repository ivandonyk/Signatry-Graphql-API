import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInvestmentAddInstitutionAccountId1600450894912 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "investment" ADD COLUMN "institution_account_id" uuid');
        await queryRunner.query('ALTER TABLE "investment" ADD CONSTRAINT "FK_InstitutionAccountId" FOREIGN KEY ("institution_account_id") REFERENCES "institution_account"("id")');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "investment" DROP COLUMN "institution_account_id"');
    }

}
