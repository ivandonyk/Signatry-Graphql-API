import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddEnabledToFinancialAdvisor1603296927472 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "enabled" boolean NOT NULL DEFAULT true;'
        );

        await queryRunner.query(
            'ALTER TABLE "financial_advisor" DROP COLUMN IF EXISTS "address_line_1";'
        );
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "address_line1" character varying;'
        );

        await queryRunner.query(
            'ALTER TABLE "financial_advisor" DROP COLUMN IF EXISTS "address_line_2";'
        );
        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "address_line2" character varying'
        );

        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "institution_name" character varying;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "financial_advisor" DROP COLUMN "institution_name";');

        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "address_line_2" character varying;'
        );
        await queryRunner.query('ALTER TABLE "financial_advisor" DROP COLUMN "address_line2";');

        await queryRunner.query(
            'ALTER TABLE "financial_advisor" ADD COLUMN "address_line_1" character varying;'
        );
        await queryRunner.query('ALTER TABLE "financial_advisor" DROP COLUMN "address_line1";');

        await queryRunner.query('ALTER TABLE "financial_advisor" DROP COLUMN "enabled";');
    }
}
