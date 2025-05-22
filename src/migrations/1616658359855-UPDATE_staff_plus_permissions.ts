import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEStaffPlusPermissions1616658359855 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'READ' WHERE role_id IN (
            SELECT id FROM role WHERE name like 'STAFF_PLUS'
            ) AND access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'FULL' WHERE role_id IN (
            SELECT id FROM role WHERE name like 'STAFF_PLUS'
            ) AND access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL';
        `);
    }
}
