import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundTable1582501519710 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund" RENAME "slug" TO "fund_code"');
        await queryRunner.query('ALTER TABLE "fund" RENAME "type_id" TO "fund_type_id"');
        await queryRunner.query('ALTER TABLE "fund" RENAME "is_enabled" TO "enabled"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "statement_recipient"');
        await queryRunner.query('ALTER TABLE "fund" ALTER COLUMN "enabled" SET DEFAULT true;');
        await queryRunner.query(
            'ALTER TABLE "fund" ADD COLUMN "amount_available" FLOAT NOT NULL DEFAULT 0'
        );
        await queryRunner.query(
            'ALTER TABLE "fund" ADD COLUMN "amount_pending" FLOAT NOT NULL DEFAULT 0'
        );
        await queryRunner.query(
            'ALTER TABLE "fund" ADD COLUMN "total_units" FLOAT NOT NULL DEFAULT 0'
        );
        await queryRunner.query('ALTER TABLE "fund" ADD COLUMN "created_by" uuid NULL');
        await queryRunner.query('ALTER TABLE "fund" ADD COLUMN "updated_by" uuid NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "updated_by"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "created_by"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "total_units"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "amount_pending"');
        await queryRunner.query('ALTER TABLE "fund" DROP COLUMN "amount_available"');
        await queryRunner.query(
            'ALTER TABLE "fund" ADD "statement_recipient" character varying NOT NULL'
        );
        await queryRunner.query('ALTER TABLE "fund" RENAME "enabled" TO "is_enabled"');
        await queryRunner.query('ALTER TABLE "fund" ALTER COLUMN "is_enabled" DROP DEFAULT;');
        await queryRunner.query('ALTER TABLE "fund" RENAME "fund_code" TO "slug"');
        await queryRunner.query('ALTER TABLE "fund" RENAME "fund_type_id" TO "type_id"');
    }
}
