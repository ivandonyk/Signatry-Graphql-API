import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEPermissionsStaffPlusMoneyMovementReadOnly1617856159317
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'NONE' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_PLUS'
        ) AND access_type = 'ADMIN_INVESTMENTS';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'FULL' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_PLUS'
        ) AND access_type = 'ADMIN_INVESTMENTS';
        `);
    }
}
