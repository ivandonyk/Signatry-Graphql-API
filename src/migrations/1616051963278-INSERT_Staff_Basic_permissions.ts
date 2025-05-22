import { MigrationInterface, QueryRunner } from 'typeorm';

export class INSERTStaffBasicPermissions1616051963278 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'READ' WHERE
        (
            access_type = 'ADMIN_GRANTS_NEW' OR
            access_type = 'ADMIN_CONTRIBUTIONS_NEW' OR
            access_type = 'ADMIN_CONTRIBUTIONS' OR
            access_type = 'ADMIN_FUNDS' OR
            access_type = 'ADMIN_USER_MANAGEMENT' OR
            access_type = 'ADMIN_RECIPIENTS' OR
            access_type = 'ADMIN_DIVESTMENTS' OR
            access_type = 'ADMIN_FUND_TRANSFERS'
        )
        AND role_id IN (
        SELECT id FROM role WHERE name LIKE 'STAFF_BASIC'
        );
        `);

        await queryRunner.query(`
        UPDATE permission SET access_level = 'NONE' WHERE
        (
        access_type = 'ADMIN_GRANTS' OR
        access_type = 'ADMIN_GRANTS_ALL' OR
        access_type = 'ADMIN_GRANTS_DUE_DILIGENCE' OR
        access_type = 'ADMIN_GRANTS_NEW' OR
        access_type = 'ADMIN_GRANTS_PAYMENTS' OR
        access_type = 'ADMIN_GRANTS_REVIEW' OR
        access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL' OR
        access_type = 'ADMIN_GRANT_FINALIZE' OR
        access_type = 'LINK_DONOR_FUNDING_ACCOUNT' OR
        access_type = 'ADMIN_BANK_ACCOUNTS' OR
        access_type = 'ADMIN_INVESTMENTS' OR
        access_type = 'ADMIN_RECONCILIATION'
        )
        AND role_id IN (
            SELECT id FROM role WHERE name LIKE 'STAFF_BASIC'
        );
        `);

        await queryRunner.query(`
        DELETE FROM  permission WHERE access_type = 'ADMIN_CONTRIBUTIONS';

        INSERT INTO permission
                    (name, description, created_on, created_by, updated_on, updated_by, version, access_level, role_id, access_type)
                    SELECT
                        'Admin Contributions',
                        'Admin Contributions',
                        now(),
                        null,
                        now(),
                        null,
                        1,
                        'FULL',
                        id,
                        'ADMIN_CONTRIBUTIONS'
                    FROM role WHERE name in (
                    'STAFF_PLUS',
                    'STAFF_FINANCE_EXECUTIVE',
                    'STAFF_ADMIN',
                    'GLOBAL_ADMIN'
                        );
        
        INSERT INTO permission
                    (name, description, created_on, created_by, updated_on, updated_by, version, access_level, role_id, access_type)
                    SELECT
                        'Admin Contributions',
                        'Admin Contributions',
                        now(),
                        null,
                        now(),
                        null,
                        1,
                        'READ',
                        id,
                        'ADMIN_CONTRIBUTIONS'
                    FROM role WHERE name in (
                    'Donor',
                    'STAFF_BASIC',
                    'STAFF_FINANCE'
                        );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE permission SET access_level = 'FULL'
        WHERE
        (
            access_type = 'ADMIN_GRANTS' OR
            access_type = 'ADMIN_GRANTS_ALL' OR
            access_type = 'ADMIN_GRANTS_DUE_DILIGENCE' OR
            access_type = 'ADMIN_GRANTS_NEW' OR
            access_type = 'ADMIN_GRANTS_PAYMENTS' OR
            access_type = 'ADMIN_GRANTS_REVIEW' OR
            access_type = 'ADMIN_GRANTS_SPECIAL_APPROVAL' OR
            access_type = 'ADMIN_GRANT_FINALIZE' OR
            access_type = 'LINK_DONOR_FUNDING_ACCOUNT' OR
            access_type = 'ADMIN_BANK_ACCOUNTS' OR
            access_type = 'ADMIN_INVESTMENTS' OR
            access_type = 'ADMIN_DIVESTMENTS' OR
            access_type = 'ADMIN_RECONCILIATION' OR
            access_type = 'ADMIN_FUND_TRANSFERS'
        )
        AND role_id IN (
        SELECT id FROM role WHERE name LIKE 'STAFF_BASIC'
        );
        `);

        await queryRunner.query(`
        DELETE FROM  permission WHERE access_type = 'ADMIN_CONTRIBUTIONS';

        INSERT INTO permission
                    (name, description, created_on, created_by, updated_on, updated_by, version, access_level, role_id, access_type)
                    SELECT
                        'Admin Contributions',
                        'Admin Contributions',
                        now(),
                        null,
                        now(),
                        null,
                        1,
                        'NONE',
                        id,
                        'ADMIN_CONTRIBUTIONS'
                    FROM role WHERE name in (
                    'STAFF_PLUS',
                    'STAFF_FINANCE_EXECUTIVE',
                    'STAFF_ADMIN',
                    'GLOBAL_ADMIN',
                    'Donor',
                    'STAFF_BASIC',
                    'STAFF_FINANCE'
                        );
        `);
    }
}
