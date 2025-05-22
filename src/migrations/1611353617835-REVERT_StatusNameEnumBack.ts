import { MigrationInterface, QueryRunner } from 'typeorm';

export class REVERTStatusNameEnumBack1611353617835 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
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
            );
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE permission ALTER COLUMN access_type type varchar(1000) USING access_type::varchar(1000);
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE permission ALTER COLUMN access_type DROP DEFAULT;
        `);

        await queryRunner.query(/*sql */ `
            DROP TYPE IF EXISTS permission_access_type;
        `);

        await queryRunner.query(/*sql */ `
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
                'ADMIN_FUND_TRANSFERS',
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

        await queryRunner.query(/*sql */ `
            UPDATE permission SET access_type = 'ADMIN_CONTACTS' WHERE access_type = 'ADMIN_USER_MANAGEMENT';
            UPDATE permission SET access_type = 'ADMIN_SPECIAL_APPROVAL' WHERE access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL';
            UPDATE permission SET access_type = 'ADMIN_PAYMENTS' WHERE access_type = 'ADMIN_GRANTS_PAYMENTS';
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE permission ALTER COLUMN access_type type permission_access_type USING access_type::permission_access_type;
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE permission ALTER COLUMN access_type SET DEFAULT 'ADMIN_FUNDS'::permission_access_type;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql */ `
        ALTER TABLE permission ALTER COLUMN access_type type varchar(1000) USING access_type::varchar(1000);
    `);
        await queryRunner.query(/*sql */ `
        ALTER TABLE permission ALTER COLUMN access_type DROP DEFAULT;
    `);

        await queryRunner.query(/*sql */ `
        DROP TYPE IF EXISTS permission_access_type;
    `);
        await queryRunner.query(/*sql */ `
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
        await queryRunner.query(/*sql */ `
            UPDATE permission SET access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL' WHERE access_type = 'ADMIN_SPECIAL_APPROVAL';
            UPDATE permission SET access_type = 'ADMIN_USER_MANAGEMENT' WHERE access_type = 'ADMIN_CONTACTS';
            UPDATE permission SET access_type = 'ADMIN_GRANTS_PAYMENTS' WHERE access_type = 'ADMIN_PAYMENTS';

        `);
        await queryRunner.query(/*sql */ `
            ALTER TABLE permission ALTER COLUMN access_type type permission_access_type USING access_type::permission_access_type;
        `);

        await queryRunner.query(/*sql */ `
            ALTER TABLE permission ALTER COLUMN access_type SET DEFAULT 'ADMIN_FUNDS'::permission_access_type;
        `);
    }
}
