import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTablesToMatchERD1587155309547 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "user_profile_account" ADD COLUMN "is_primary" boolean NOT NULL DEFAULT false'
        );
        await queryRunner.query('ALTER TABLE "fund_type" DROP COLUMN "is_enabled"');
        await queryRunner.query(
            'ALTER TABLE "investment" ADD COLUMN "tenant_account_id" uuid NULL'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "user_profile_account" DROP COLUMN "is_primary"');
        await queryRunner.query(
            'ALTER TABLE "fund_type" ADD COLUMN "is_enabled" boolean NOT NULL DEFAULT TRUE'
        );
        await queryRunner.query('ALTER TABLE "investment" DROP COLUMN "tenant_account_id"');
    }
}
