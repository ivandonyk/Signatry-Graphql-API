import { MigrationInterface, QueryRunner } from 'typeorm';

export class initTenant1576013233731 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        queryRunner.query('ALTER TABLE "tenant" RENAME COLUMN "settings" TO "app_settings";');
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        queryRunner.query('ALTER TABLE "tenant" RENAME COLUMN "app_settings" TO "settings";');
    }
}
