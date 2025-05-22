import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDNewPermissionGlobalFundAccess1591999930541 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const [{ id: globalFundAccessId }] = await queryRunner.query(/* sql */ `
            INSERT INTO permission(name, description) VALUES ('GLOBAL_FUND_ACCESS', 'Ability to contribute and request grants from any fund.') RETURNING * 
        `);

        const [{ id: adminRoleId }] = await queryRunner.query(/*sql*/ `
            SELECT id FROM role WHERE name = 'Admin';
        `);

        await queryRunner.query(/* sql */ `
            INSERT INTO role_permission(role_id, permission_id) VALUES ('${adminRoleId}', '${globalFundAccessId}')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const [{ id: permissionId }] = await queryRunner.query(/* sql */ `
            SELECT id FROM permission WHERE name = 'GLOBAL_FUND_ACCESS';
        `);
        await queryRunner.query(/* sql */ `
            DELETE FROM role_permission WHERE permission_id = '${permissionId}';
        `);
        await queryRunner.query(/* sql */ `
            DELETE FROM permission WHERE name = 'GLOBAL_FUND_ACCESS';
        `);
    }
}
