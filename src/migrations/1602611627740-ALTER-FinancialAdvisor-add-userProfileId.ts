import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFinancialAdvisorAddUserProfileId1602611627740 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "user_profile_id" uuid'
        );
        await queryRunner.query('ALTER TABLE "financial_advisor" DROP COLUMN "addressLineOne"');
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "address_line_1" character varying'
        );
        await queryRunner.query('ALTER TABLE "financial_advisor" DROP COLUMN "addressLineTwo"');
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "address_line_2" character varying'
        );
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD CONSTRAINT "FK_UserProfileId" FOREIGN KEY ("user_profile_id") REFERENCES "user_profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" DROP CONSTRAINT "FK_UserProfileId"'
        );
        await queryRunner.query('ALTER TABLE "financial_advisor" DROP COLUMN "user_profile_id"');
        await queryRunner.query('ALTER TABLE "financial_advisor" DROP COLUMN "address_line_2"');
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "addressLineTwo" character varying'
        );
        await queryRunner.query('ALTER TABLE "financial_advisor" DROP COLUMN "address_line_1"');
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "addressLineOne" character varying'
        );
    }
}
