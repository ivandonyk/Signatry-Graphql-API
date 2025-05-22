import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATESTAFFADMINPermissions1618390444878 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'READ' WHERE
            role_id = (SELECT id FROM role WHERE name like 'STAFF_ADMIN')
            AND access_type = 'ADMIN_INVESTMENT_POOLS';
            
            UPDATE permission SET access_level = 'READ' WHERE
            role_id = (SELECT id FROM role WHERE name like 'STAFF_ADMIN')
            AND access_type = 'ADMIN_GRANTS_REVIEW';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'FULL' WHERE
            role_id = (SELECT id FROM role WHERE name like 'STAFF_ADMIN')
            AND access_type = 'ADMIN_INVESTMENT_POOLS';
            
            UPDATE permission SET access_level = 'FULL' WHERE
            role_id = (SELECT id FROM role WHERE name like 'STAFF_ADMIN')
            AND access_type = 'ADMIN_GRANTS_REVIEW';
        `);
    }
}
