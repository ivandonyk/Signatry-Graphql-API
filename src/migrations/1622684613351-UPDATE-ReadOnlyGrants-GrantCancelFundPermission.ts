import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEReadOnlyGrantsGrantCancelFundPermission1622684613351
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE fund_permission
                SET "access_level" = 'FULL'
            WHERE fund_role_id IN (
                SELECT "id"
                FROM fund_role
                WHERE "name" = 'Read Only + Grants'
                AND "enabled")
                AND "access_type" = 'GRANT_CANCEL'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE fund_permission
                SET "access_level" = 'NONE'
            WHERE fund_role_id IN (
                SELECT "id"
                FROM fund_role
                WHERE "name" = 'Read Only + Grants'
                AND "enabled")
                AND "access_type" = 'GRANT_CANCEL'
        `);
    }
}
