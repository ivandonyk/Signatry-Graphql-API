import { MigrationInterface, QueryRunner } from 'typeorm';

export class FIXPermissions1620243644558 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        -- STEP 1: Update Name / Description to remove duplicates
        UPDATE permission
            SET "name" = 'Admin Grants - New'
            , "description" = 'Admin Grants - New'
        WHERE "access_type" = 'ADMIN_GRANTS_NEW';

        UPDATE permission
            SET "name" = 'Link Donor Funding Account'
            WHERE "access_type" = 'LINK_DONOR_FUNDING_ACCOUNT';

        -- STEP 2: UPDATE _MASTER Role
        INSERT INTO permission
            ("name", "description", "access_level", "role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM role WHERE name = '_MASTER') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM permission
                                        WHERE role_id IN (SELECT id
                                                            FROM role
                                                            WHERE name IN ('_MASTER')))) AS "newRoles";

        -- STEP 3: UPDATE Charity Role
        INSERT INTO permission
            ("name", "description", "access_level", "role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM role WHERE name = 'CHARITY') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM permission
                                        WHERE role_id IN (SELECT id
                                                            FROM role
                                                            WHERE name IN ('CHARITY')))) AS "newRoles";

        -- STEP 3: UPDATE Donor Role
        INSERT INTO permission
            ("name", "description", "access_level", "role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM role WHERE name = 'Donor') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM permission
                                        WHERE role_id IN (SELECT id
                                                            FROM role
                                                            WHERE name IN ('Donor')))) AS "newRoles";

        -- STEP 3: UPDATE Global Admin Role
        INSERT INTO permission
            ("name", "description", "access_level", "role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM role WHERE name = 'GLOBAL_ADMIN') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM permission
                                        WHERE role_id IN (SELECT id
                                                            FROM role
                                                            WHERE name IN ('GLOBAL_ADMIN')))) AS "newRoles";

        -- STEP 3: UPDATE STAFF ADMIN Role
        INSERT INTO permission
            ("name", "description", "access_level", "role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM role WHERE name = 'STAFF_ADMIN') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM permission
                                        WHERE role_id IN (SELECT id
                                                            FROM role
                                                            WHERE name IN ('STAFF_ADMIN')))) AS "newRoles";

        -- STEP 3: UPDATE STAFF BASIC Role
        INSERT INTO permission
            ("name", "description", "access_level", "role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM role WHERE name = 'STAFF_BASIC') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM permission
                                        WHERE role_id IN (SELECT id
                                                            FROM role
                                                            WHERE name IN ('STAFF_BASIC')))) AS "newRoles";

        -- STEP 3: UPDATE STAFF FINANCE Role
        INSERT INTO permission
            ("name", "description", "access_level", "role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM role WHERE name = 'STAFF_FINANCE') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM permission
                                        WHERE role_id IN (SELECT id
                                                            FROM role
                                                            WHERE name IN ('STAFF_FINANCE')))) AS "newRoles";

        -- STEP 3: UPDATE STAFF FINANCE EXECUTIVE Role
        INSERT INTO permission
            ("name", "description", "access_level", "role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM role WHERE name = 'STAFF_FINANCE_EXECUTIVE') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM permission
                                        WHERE role_id IN (SELECT id
                                                            FROM role
                                                            WHERE name IN ('STAFF_FINANCE_EXECUTIVE')))) AS "newRoles";

        -- STEP 3: UPDATE STAFF PLUS Role
        INSERT INTO permission
            ("name", "description", "access_level", "role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM role WHERE name = 'STAFF_PLUS') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM permission
                                        WHERE role_id IN (SELECT id
                                                            FROM role
                                                            WHERE name IN ('STAFF_PLUS')))) AS "newRoles";
    `);
    }

    // ignoring as we'd be reverting into bad data
    public async down(queryRunner: QueryRunner): Promise<void> {
        return Promise.resolve();
    }
}
