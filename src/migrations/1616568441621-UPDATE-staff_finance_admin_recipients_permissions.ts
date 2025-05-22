import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEStaffFinanceAdminRecipientsPermissions1616568441621
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_RECIPIENTS';
            
            INSERT INTO permission
            (name, description, created_on, created_by, updated_on, updated_by, version, access_level, role_id, access_type)
            SELECT
                'Grant Now CTA',
                'Grant Now CTA',
                now(),
                null,
                now(),
                null,
                1,
                'READ',
                id,
                'CHARITY_GRANT_NOW_CTA'
                FROM role WHERE name in ('STAFF_FINANCE');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'NONE'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE')
            AND access_type = 'ADMIN_RECIPIENTS';
        `);
    }
}
