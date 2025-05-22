import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEStaffFinancePermissions1616172422410 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_INVESTMENT_POOLS';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_CONTRIBUTIONS';

            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_RECIPIENTS';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_INVESTMENTS';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_DIVESTMENTS';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_BATCHES';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS_ALL';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS';

            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS_NEW';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS_PAYMENTS';

            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS_REVIEW';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_IMA_MANAGEMENT';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'NONE'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_INVESTMENT_POOLS';

            UPDATE permission SET access_level = 'NONE'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_CONTRIBUTIONS';

            UPDATE permission SET access_level = 'NONE'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_RECIPIENTS';

            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_INVESTMENTS';

            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_DIVESTMENTS';

            UPDATE permission SET access_level = 'NONE'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_BATCHES';

            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS_ALL';

            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS_NEW';

            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS_PAYMENTS';

            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_GRANTS_REVIEW';

            UPDATE permission SET access_level = 'NONE'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_IMA_MANAGEMENT';
        `);
    }
}
