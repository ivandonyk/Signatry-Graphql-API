import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEPermissionsStaffFinanceExecAdminFundsFull1617860032461
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'FULL' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE'
        ) AND access_type = 'ADMIN_FUNDS';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'READ' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE'
        ) AND access_type = 'ADMIN_FUNDS';
        `);
    }
}
