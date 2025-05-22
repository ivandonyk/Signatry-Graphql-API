import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEStaffFinanceExecutivePermissions1616660395844 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'READ' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE'
        ) AND access_type = 'ADMIN_INVESTMENTS';
        
        UPDATE permission SET access_level = 'READ' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE'
        ) AND access_type = 'ADMIN_DIVESTMENTS';
        
        UPDATE permission SET access_level = 'READ' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE'
        ) AND access_type = 'ADMIN_BANK_ACCOUNTS';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'FULL' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE'
        ) AND access_type = 'ADMIN_INVESTMENTS';
        
        UPDATE permission SET access_level = 'FULL' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE'
        ) AND access_type = 'ADMIN_DIVESTMENTS';
        
        UPDATE permission SET access_level = 'FULL' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE'
        ) AND access_type = 'ADMIN_BANK_ACCOUNTS';
        `);
    }
}
