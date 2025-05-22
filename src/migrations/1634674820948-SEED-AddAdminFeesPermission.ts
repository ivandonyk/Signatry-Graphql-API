import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDAddAdminFeesPermission1634674820948 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TYPE permission_access_type RENAME TO "_permission_access_type";
        `);
        await queryRunner.query(/* sql */ `
            CREATE TYPE permission_access_type AS ENUM (
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
                'LINK_DONOR_FUNDING_ACCOUNT',
                'ADMIN_FUND_TRANSFERS',
                'ADMIN_FEES'
            );
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE permission RENAME COLUMN "access_type" TO "_access_type";
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE permission ADD COLUMN access_type permission_access_type NOT NULL DEFAULT 'USER_DEFAULTS';
        `);
        await queryRunner.query(/* sql */ `
            UPDATE permission SET access_type = _access_type::text::permission_access_type;
        `);

        await queryRunner.query(/* sql */ `
            INSERT INTO permission (role_id, name, description, access_level, access_type)
            SELECT r.id, 'Admin Fees', 'Admin Fees', 'FULL', 'ADMIN_FEES'
            FROM role r;
        `);

        await queryRunner.query(/* sql */ `
            UPDATE permission
            SET access_level = 'READ'
            WHERE role_id = (SELECT id FROM role WHERE name = 'STAFF_BASIC')
            AND access_type = 'ADMIN_FEES'
        `);

        await queryRunner.query(/* sql */ `
            UPDATE permission
            SET access_level = 'NONE'
            WHERE role_id = (SELECT id FROM role WHERE name = 'Donor')
            AND access_type = 'ADMIN_FEES'
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE permission DROP COLUMN _access_type;
        `);
        await queryRunner.query(/* sql */ `
            DROP TYPE IF EXISTS _permission_access_type;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            DELETE FROM permission
            WHERE access_type = 'ADMIN_FEES'
        `);

        await queryRunner.query(/* sql */ `
            ALTER TYPE permission_access_type RENAME TO "_permission_access_type";
        `);
        await queryRunner.query(/* sql */ `
            CREATE TYPE permission_access_type AS ENUM (
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
                'LINK_DONOR_FUNDING_ACCOUNT',
                'ADMIN_FUND_TRANSFERS'
            );
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE permission RENAME COLUMN "access_type" TO "_access_type";
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE permission ADD COLUMN access_type permission_access_type NOT NULL DEFAULT 'USER_DEFAULTS';
        `);
        await queryRunner.query(/* sql */ `
            UPDATE permission SET access_type = _access_type::text::permission_access_type;
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE permission DROP COLUMN _access_type;
        `);
        await queryRunner.query(/* sql */ `
            DROP TYPE IF EXISTS _permission_access_type;
        `);
    }
}
