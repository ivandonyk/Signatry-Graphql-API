import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEPermssionsStaffFinanceReadOnlyAdminGrants1616972102808
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission
        SET access_level = 'READ'
        WHERE access_type = 'ADMIN_GRANTS' AND
              role_id = (SELECT id FROM role WHERE name LIKE 'STAFF_FINANCE');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission
        SET access_level = 'FULL'
        WHERE access_type = 'ADMIN_GRANTS' AND
              role_id = (SELECT id FROM role WHERE name LIKE 'STAFF_FINANCE');
        `);
    }
}
