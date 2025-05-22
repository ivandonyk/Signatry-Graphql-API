import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDNewPermissionsForGrantFlow1590696100165 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/* sql */ `
        INSERT INTO permission(name, description) VALUES ('GRANT_MANAGEMENT', 'Ability to view the Grant Management flow and take actions on grants to move them through the process.'), ('GRANT_SPECIAL_APPROVAL', 'Ability to view the Special Approval flow and take actions on grants exceeding the special approval threshold set by the tenant');
    `);
        const [{ id: adminRoleId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM role WHERE name = 'Admin';
    `);
        const [{ id: staffRoleId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM role WHERE name = 'Staff';
    `);

        const [{ id: grantMgmtPermissionId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM permission WHERE name = 'GRANT_MANAGEMENT';
    `);
        const [{ id: grantSAPermissionId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM permission WHERE name = 'GRANT_SPECIAL_APPROVAL';
    `);
        const [{ id: adminGrantPermissionId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM permission WHERE name = 'ADMIN_GRANT_RECS';
    `);
        await queryRunner.query(/* sql */ `
        DELETE FROM role_permission WHERE permission_id = '${adminGrantPermissionId}';
    `);
        await queryRunner.query(/* sql */ `
        DELETE FROM permission WHERE name = 'ADMIN_GRANT_RECS';
    `);

        await queryRunner.query(/* sql */ `
        INSERT INTO role_permission(role_id, permission_id) VALUES ('${adminRoleId}', '${grantMgmtPermissionId}'), ('${adminRoleId}', '${grantSAPermissionId}'), ('${staffRoleId}', '${grantMgmtPermissionId}');
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/* sql */ `
        INSERT INTO permission(name, description) VALUES ('ADMIN_GRANT_RECS', 'Ability to view the Grant Recommendations.');
    `);
        const [{ id: grantMgmtPermissionId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM permission WHERE name = 'GRANT_MANAGEMENT';
    `);
        const [{ id: grantSAPermissionId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM permission WHERE name = 'GRANT_SPECIAL_APPROVAL';
    `);
        const [{ id: adminGrantPermissionId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM permission WHERE name = 'ADMIN_GRANT_RECS';
    `);
        const [{ id: adminRoleId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM role WHERE name = 'Admin';
    `);
        const [{ id: staffRoleId }] = await queryRunner.query(/*sql*/ `
        SELECT id FROM role WHERE name = 'Staff';
    `);
        await queryRunner.query(/* sql */ `
        DELETE FROM role_permission WHERE permission_id = '${grantMgmtPermissionId}' OR permission_id = '${grantSAPermissionId}';
    `);
        await queryRunner.query(/* sql */ `
        DELETE FROM permission WHERE name = 'GRANT_MANAGEMENT' OR name = 'GRANT_SPECIAL_APPROVAL';
    `);
        await queryRunner.query(/* sql */ `
        INSERT INTO role_permission(role_id, permission_id) VALUES ('${adminRoleId}', '${adminGrantPermissionId}'), ('${staffRoleId}', '${adminGrantPermissionId}');
    `);
    }
}
