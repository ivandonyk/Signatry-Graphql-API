import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDRolePermissions1587155050485 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        const [{ id: userRoleId }] = await queryRunner.query(`
            SELECT id FROM role WHERE name = 'User'
        `);

        const [{ id: staffRoleId }] = await queryRunner.query(`
            SELECT id FROM role WHERE name = 'Staff'
        `);

        const [{ id: adminRoleId }] = await queryRunner.query(`
            SELECT id FROM role WHERE name = 'Admin'
        `);

        const userPermissions = await queryRunner.query(`
            SELECT id FROM permission WHERE name = 'USER_DEFAULTS'
        `);

        const staffPermissions = await queryRunner.query(`
            SELECT id FROM permission WHERE name NOT IN ('ADMIN_TOTALS', 'ADMIN_UNIT_ADJUST', 'ADMIN_BATCH_SUBMIT', 'ADMIN_BATCH_FINALIZE', 'ADMIN_TENANT_FUNDING_SOURCES')
        `);

        const adminPermissions = await queryRunner.query(`
            SELECT id FROM permission
        `);

        await Promise.all(
            userPermissions.map(async permission => {
                return queryRunner.query(`
                    INSERT INTO role_permission(role_id, permission_id) VALUES ('${userRoleId}', '${permission.id}')
                `);
            })
        );

        await Promise.all(
            staffPermissions.map(async permission => {
                return queryRunner.query(`
                    INSERT INTO role_permission(role_id, permission_id) VALUES ('${staffRoleId}', '${permission.id}')
                `);
            })
        );

        await Promise.all(
            adminPermissions.map(async permission => {
                return queryRunner.query(`
                    INSERT INTO role_permission(role_id, permission_id) VALUES ('${adminRoleId}', '${permission.id}')
                `);
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DELETE FROM "role_permission"');
    }
}
