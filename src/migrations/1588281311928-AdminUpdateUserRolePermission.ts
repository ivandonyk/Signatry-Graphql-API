import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateUserRolePermissionAdded1588276941028 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/* sql */ `
            INSERT INTO permission(name, description) VALUES ('ADMIN_UPDATE_USER_ROLE', 'Ability to view the Users navigation option and update role for any user');
        `);

        const [{ id: adminRoleId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM role WHERE name = 'Admin';
        `);

        const [{ id: permissionId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM permission WHERE name = 'ADMIN_UPDATE_USER_ROLE';
        `);

        await queryRunner.query(/* sql */ `
            INSERT INTO role_permission(role_id, permission_id) VALUES ('${adminRoleId}', '${permissionId}');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        const [{ id: permissionId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM permission WHERE name = 'ADMIN_UPDATE_USER_ROLE';
        `);

        await queryRunner.query(/* sql */ `
            DELETE FROM role_permission WHERE id = '${permissionId}';
        `);

        await queryRunner.query(/* sql */ `
            DELETE FROM permission WHERE name = 'ADMIN_UPDATE_USER_ROLE';
        `);
    }
}
