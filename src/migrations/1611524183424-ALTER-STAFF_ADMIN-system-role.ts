import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERSTAFFADMINSystemRole1611524183424 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE permission ALTER COLUMN access_type type varchar(1000) USING access_type::varchar(1000);'
        );
        await queryRunner.query('ALTER TABLE permission ALTER COLUMN access_type DROP DEFAULT;');
        await queryRunner.query('DROP TYPE IF EXISTS permission_access_type;');
        await queryRunner.query(`
        CREATE TYPE permission_access_Type AS ENUM (
            'USER_DEFAULTS',
            'ADMIN_FUNDS',
            'ADMIN_IMA_MANAGEMENT',
            'ADMIN_INVESTMENT_POOLS',
            'ADMIN_CONTRIBUTIONS',
            'ADMIN_CONTRIBUTIONS_NEW',
            'ADMIN_BATCHES',
            'ADMIN_RECIPIENTS',
            'ADMIN_GRANTS',
            'ADMIN_GRANTS_NEW',
            'ADMIN_GRANTS_DUE_DILIGENCE',
            'ADMIN_GRANTS_REVIEW',
            'ADMIN_GRANTS_PAYMENTS',
            'ADMIN_GRANTS_ALL',
            'ADMIN_GRANTS_SPECIAL_APPROVAL',
            'ADMIN_GRANT_FINALIZE',
            'ADMIN_FUND_TRANSFERS',
            'ADMIN_USER_MANAGEMENT',
            'ADMIN_INVESTMENTS',
            'ADMIN_DIVESTMENTS',
            'ADMIN_BANK_ACCOUNTS',
            'ADMIN_RECONCILIATION',
            'ADMIN_CONTENT_MANAGEMENT',
            'FUND_CREATE',
            'CHARITY_GRANT_NOW_CTA',
            'CHARITY_FAVORITES',
            'CHARITY_CREATE',
            'CHARITY_SEARCH',
            'CHARITY_PROFILE',
            'LINK_DONOR_FUNDING_ACCOUNT'
        );
        `);

        await queryRunner.query(`
            UPDATE permission SET access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL', name = 'Admin Grants Special Approval' WHERE access_type = 'ADMIN_SPECIAL_APPROVAL';
            UPDATE permission SET access_type = 'ADMIN_GRANTS_PAYMENTS', name = 'Admin Grants Payments' WHERE access_type = 'ADMIN_PAYMENTS';
        `);

        await queryRunner.query(
            'ALTER TABLE permission ALTER COLUMN access_type type permission_access_type USING access_type::permission_access_type;'
        );
        await queryRunner.query(
            "ALTER TABLE permission ALTER COLUMN access_type SET DEFAULT 'ADMIN_FUNDS'::permission_access_type;"
        );

        // STAFF_ADMIN - adding & updating permission access types
        const [{ id: staff_admin_role_id }] = await queryRunner.query(/*sql */ `
        SELECT id from role where name = 'STAFF_ADMIN'
    `);

        await queryRunner.query(`
         INSERT INTO permission (name, description, created_on, created_by, updated_on, updated_by, version, access_level, access_type, role_id)
         VALUES
             ('Admin IMA Management'         , 'Admin IMA Management'         , now(), null, now(), null, 1, 'NONE', 'ADMIN_IMA_MANAGEMENT'      , '${staff_admin_role_id}'),
             ('Admin Investment Pools'       , 'Admin Investment Pools'       , now(), null, now(), null, 1, 'NONE', 'ADMIN_INVESTMENT_POOLS'    , '${staff_admin_role_id}'),
             ('Admin Contributions'          , 'Admin Contributions'          , now(), null, now(), null, 1, 'NONE', 'ADMIN_CONTRIBUTIONS'       , '${staff_admin_role_id}'),
             ('Admin New Contributions'      , 'Admin New Contributions'      , now(), null, now(), null, 1, 'NONE', 'ADMIN_CONTRIBUTIONS_NEW'   , '${staff_admin_role_id}'),
             ('Admin Batches'                , 'Admin Batches'                , now(), null, now(), null, 1, 'NONE', 'ADMIN_BATCHES'             , '${staff_admin_role_id}'),
             ('Admin New Grants'             , 'Admin New Grants'             , now(), null, now(), null, 1, 'NONE', 'ADMIN_GRANTS_NEW'          , '${staff_admin_role_id}'),
             ('Admin Grants - Due Diligence' , 'Admin Grants - Due Diligence' , now(), null, now(), null, 1, 'NONE', 'ADMIN_GRANTS_DUE_DILIGENCE', '${staff_admin_role_id}'),
             ('Admin Grants - Review'        , 'Admin Grants - Review'        , now(), null, now(), null, 1, 'NONE', 'ADMIN_GRANTS_REVIEW'       , '${staff_admin_role_id}'),
             ('Admin Grants - All'           , 'Admin Grants - All'           , now(), null, now(), null, 1, 'NONE', 'ADMIN_GRANTS_ALL'          , '${staff_admin_role_id}'),
             ('Admin - Content Management'   , 'Admin - Content Management'   , now(), null, now(), null, 1, 'NONE', 'ADMIN_CONTENT_MANAGEMENT'  , '${staff_admin_role_id}');        
             `);

        await queryRunner.query(`
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'USER_DEFAULTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_BANK_ACCOUNTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_INVESTMENTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_DIVESTMENTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_USER_MANAGEMENT';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_FUNDS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_DUE_DILIGENCE';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_REVIEW';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_NEW';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_ALL';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_RECIPIENTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_INVESTMENT_POOLS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_BATCHES';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_IMA_MANAGEMENT';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_CONTENT_MANAGEMENT';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_CONTRIBUTIONS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_CONTRIBUTIONS_NEW';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANT_FINALIZE';
            UPDATE permission SET access_level = 'READ'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_RECONCILIATION';
            UPDATE permission SET access_level = 'NONE'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL';
            UPDATE permission SET access_level = 'NONE'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_PAYMENTS';
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const [{ id: staff_admin_role_id }] = await queryRunner.query(/*sql */ `
        SELECT id from role where name = 'STAFF_ADMIN'
    `);

        await queryRunner.query(`
            DELETE FROM permission WHERE access_type IN (
                'ADMIN_IMA_MANAGEMENT',
                'ADMIN_INVESTMENT_POOLS',
                'ADMIN_CONTRIBUTIONS',
                'ADMIN_CONTRIBUTIONS_NEW',
                'ADMIN_BATCHES',
                'ADMIN_GRANTS_NEW',
                'ADMIN_GRANTS_DUE_DILIGENCE',
                'ADMIN_GRANTS_REVIEW',
                'ADMIN_GRANTS_ALL',
                'ADMIN_CONTENT_MANAGEMENT'
            ) AND role_id = '${staff_admin_role_id}';`);

        await queryRunner.query(`
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'USER_DEFAULTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_CONTACTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_FUNDS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_SPECIAL_APPROVAL';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_PAYMENTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_DUE_DILIGENCE';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_REVIEW';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_NEW';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANTS_ALL';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_GRANT_FINALIZE';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_BANK_ACCOUNTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_INVESTMENTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_DIVESTMENTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_RECONCILIATION';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_RECIPIENTS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_INVESTMENT_POOLS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_BATCHES';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_IMA_MANAGEMENT';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_CONTENT_MANAGEMENT';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_CONTRIBUTIONS';
            UPDATE permission SET access_level = 'FULL'	WHERE role_id='${staff_admin_role_id}' AND access_type = 'ADMIN_CONTRIBUTIONS_NEW';
         `);

        await queryRunner.query(
            'ALTER TABLE permission ALTER COLUMN access_type type varchar(1000) USING access_type::varchar(1000);'
        );
        await queryRunner.query('ALTER TABLE permission ALTER COLUMN access_type DROP DEFAULT;');
        await queryRunner.query('DROP TYPE IF EXISTS permission_access_type;');
        await queryRunner.query(`
            CREATE TYPE permission_access_Type AS ENUM (
                'USER_DEFAULTS',
                'ADMIN_FUNDS',
                'ADMIN_IMA_MANAGEMENT',
                'ADMIN_INVESTMENT_POOLS',
                'ADMIN_CONTRIBUTIONS',
                'ADMIN_CONTRIBUTIONS_NEW',
                'ADMIN_BATCHES',
                'ADMIN_RECIPIENTS',
                'ADMIN_GRANTS',
                'ADMIN_GRANTS_NEW',
                'ADMIN_GRANTS_DUE_DILIGENCE',
                'ADMIN_GRANTS_REVIEW',
                'ADMIN_PAYMENTS',
                'ADMIN_GRANTS_ALL',
                'ADMIN_SPECIAL_APPROVAL',
                'ADMIN_GRANT_FINALIZE',
                'ADMIN_CONTACTS',
                'ADMIN_INVESTMENTS',
                'ADMIN_DIVESTMENTS',
                'ADMIN_BANK_ACCOUNTS',
                'ADMIN_RECONCILIATION',
                'ADMIN_CONTENT_MANAGEMENT',
                'CHARITY_GRANT_NOW_CTA',
                'CHARITY_FAVORITES',
                'CHARITY_CREATE',
                'CHARITY_SEARCH',
                'CHARITY_PROFILE',
                'LINK_DONOR_FUNDING_ACCOUNT'
            );
            `);

        await queryRunner.query(`
                UPDATE permission SET access_type = 'ADMIN_CONTACTS', name = 'Admin Contacts' WHERE access_type = 'ADMIN_USER_MANAGEMENT';
                UPDATE permission SET access_type = 'ADMIN_SPECIAL_APPROVAL', name = 'Admin Special Approval' WHERE access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL';
                UPDATE permission SET access_type = 'ADMIN_PAYMENTS', name = 'Admin Payments' WHERE access_type = 'ADMIN_GRANTS_PAYMENTS';
            `);

        await queryRunner.query(
            'ALTER TABLE permission ALTER COLUMN access_type type permission_access_type USING access_type::permission_access_type;'
        );
        await queryRunner.query(
            "ALTER TABLE permission ALTER COLUMN access_type SET DEFAULT 'ADMIN_FUNDS'::permission_access_type;"
        );
    }
}
