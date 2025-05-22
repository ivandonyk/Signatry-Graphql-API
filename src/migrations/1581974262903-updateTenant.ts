import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTenant1581974262903 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'ALTER TABLE "tenant" RENAME COLUMN app_settings TO app_setting',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "tenant" ADD "enabled" boolean NOT NULL DEFAULT true',
            undefined
        );
        await queryRunner.query(
            'ALTER TABLE "tenant" ADD "description" character varying',
            undefined
        );
        await queryRunner.query('ALTER TABLE "tenant" ADD "created_by_id" uuid', undefined);
        await queryRunner.query('ALTER TABLE "tenant" ADD "updated_by_id" uuid', undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('ALTER TABLE "tenant" DROP COLUMN "updated_by_id"', undefined);
        await queryRunner.query('ALTER TABLE "tenant" DROP COLUMN "created_by_id"', undefined);
        await queryRunner.query('ALTER TABLE "tenant" DROP COLUMN "description"', undefined);
        await queryRunner.query('ALTER TABLE "tenant" DROP COLUMN "enabled"', undefined);
        await queryRunner.query(
            'ALTER TABLE "tenant" RENAME COLUMN app_setting TO app_settings',
            undefined
        );
    }
}
