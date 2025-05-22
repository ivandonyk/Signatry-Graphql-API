import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERRemoveTrailingSlashFromTenantURL1604958214398 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "tenant" SET "url" = 'www.signatry.com' WHERE "name" = 'The Signatry'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "tenant" SET "url" = 'www.signatry.com/' WHERE "name" = 'The Signatry'
        `);
    }
}
