import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEChangeStaffFinanceExecToRead1615882260606 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_RECIPIENTS';
            
            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_GRANTS_NEW';
            
            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_GRANTS_DUE_DILIGENCE';
            
            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_GRANTS_REVIEW';
            
            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_USER_MANAGEMENT';
            
            UPDATE permission SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_FUNDS';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_RECIPIENTS';
            
            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_GRANTS_NEW'; 
            
            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_GRANTS_DUE_DILIGENCE';
            
            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_GRANTS_REVIEW';
            
            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_USER_MANAGEMENT';
            
            UPDATE permission SET access_level = 'FULL'
            WHERE role_id = (SELECT id FROM role WHERE name like 'STAFF_FINANCE_EXECUTIVE')
            AND access_type = 'ADMIN_FUNDS';
        `);
    }
}
