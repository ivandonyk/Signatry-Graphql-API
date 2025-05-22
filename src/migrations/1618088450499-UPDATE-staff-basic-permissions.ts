import { MigrationInterface, QueryRunner } from 'typeorm';

export class UPDATEStaffBasicPermissions1618088450499 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'READ' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_BASIC'
        ) AND access_type = 'FUND_CREATE';
        `);

        await queryRunner.query(`
        UPDATE permission SET access_level = 'READ' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_BASIC'
        ) AND access_type = 'ADMIN_GRANTS';
        `);

        await queryRunner.query(`
            INSERT INTO permission
            (name, description, created_on, created_by,
             updated_on, updated_by, version, access_level, role_id, access_type)
            select 'Admin Grants', 'Admin Grants', now(), null, now(), null ,1, 'READ',
             (select id from role where name = 'STAFF_BASIC'), 'ADMIN_GRANTS_NEW'
            where not exists (select 1 from permission where role_id = (select id from role where name = 'STAFF_BASIC')
            and access_type = 'ADMIN_GRANTS_NEW');
            
            INSERT INTO permission
            (name, description, created_on, created_by, updated_on,
             updated_by, version, access_level, role_id, access_type)
            select 'Admin Grants - Due Diligence', 'Admin Grants - Due Diligence', now(), null, now(), null ,1, 'READ',
             (select id from role where name = 'STAFF_BASIC'), 'ADMIN_GRANTS_DUE_DILIGENCE'
            where not exists (select 1 from permission where role_id = (select id from role where name = 'STAFF_BASIC')
            and access_type = 'ADMIN_GRANTS_DUE_DILIGENCE');
            
            INSERT INTO permission
            (name, description, created_on, created_by, updated_on,
             updated_by, version, access_level, role_id, access_type)
            select 'Admin Grants - Review', 'Admin Grants - Review', now(), null, now(), null ,1, 'READ',
             (select id from role where name = 'STAFF_BASIC'), 'ADMIN_GRANTS_REVIEW'
            where not exists (select 1 from permission where role_id = (select id from role where name = 'STAFF_BASIC')
            and access_type = 'ADMIN_GRANTS_REVIEW');
            
            INSERT INTO permission
            (name, description, created_on, created_by, updated_on,
             updated_by, version, access_level, role_id, access_type)
            select 'Admin Grants - All', 'Admin Grants - All', now(), null, now(), null ,1, 'READ',
             (select id from role where name = 'STAFF_BASIC'), 'ADMIN_GRANTS_ALL'
            where not exists (select 1 from permission where role_id = (select id from role where name = 'STAFF_BASIC')
            and access_type = 'ADMIN_GRANTS_ALL');
            
            INSERT INTO permission
            (name, description, created_on, created_by, updated_on,
             updated_by, version, access_level, role_id, access_type)
            select 'Admin Special Approval', 'Admin Special Approval', now(), null, now(), null ,1, 'READ',
             (select id from role where name = 'STAFF_BASIC'), 'ADMIN_GRANTS_SPECIAL_APPROVAL'
            where not exists (select 1 from permission where role_id = (select id from role where name = 'STAFF_BASIC')
            and access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL');
            
            INSERT INTO permission
            (name, description, created_on, created_by, updated_on,
             updated_by, version, access_level, role_id, access_type)
            select 'Admin Grant Finalize', 'Admin Grant Finalize', now(), null, now(), null ,1, 'READ',
             (select id from role where name = 'STAFF_BASIC'), 'ADMIN_GRANT_FINALIZE'
            where not exists (select 1 from permission where role_id = (select id from role where name = 'STAFF_BASIC')
            and access_type = 'ADMIN_GRANT_FINALIZE');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'FULL' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_BASIC'
        ) AND access_type = 'FUND_CREATE';
        `);

        await queryRunner.query(`
        UPDATE permission SET access_level = 'NONE' WHERE role_id IN (
        SELECT id FROM role WHERE name like 'STAFF_BASIC'
        ) AND access_type = 'ADMIN_GRANTS';
        `);

        await queryRunner.query(`
        DELETE FROM permission
        WHERE role_id = (select id from role where name = 'STAFF_BASIC')
                and access_type in
                    ('ADMIN_GRANTS_NEW',
                    'ADMIN_GRANTS_DUE_DILIGENCE',
                    'ADMIN_GRANTS_REVIEW',
                    'ADMIN_GRANTS_ALL',
                    'ADMIN_GRANTS_SPECIAL_APPROVAL',
                    'ADMIN_GRANT_FINALIZE');
        `);
    }
}
