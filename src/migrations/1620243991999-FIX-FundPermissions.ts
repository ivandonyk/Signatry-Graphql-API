import { MigrationInterface, QueryRunner } from 'typeorm';

export class FIXFundPermissions1620243991999 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
        -- STEP 1: UPDATE _MASTER Role
        INSERT INTO fund_permission
            ("name", "description", "access_level", "fund_role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM fund_role WHERE name = '_MASTER') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM fund_permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM fund_permission
                                        WHERE fund_role_id IN (SELECT id
                                                            FROM fund_role
                                                            WHERE name IN ('_MASTER')))) AS "newRoles";

        -- STEP 2: UPDATE Full Access Role
        INSERT INTO fund_permission
            ("name", "description", "access_level", "fund_role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM fund_role WHERE name = 'Full Access') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM fund_permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM fund_permission
                                        WHERE fund_role_id IN (SELECT id
                                                            FROM fund_role
                                                            WHERE name IN ('Full Access')))) AS "newRoles";

        -- STEP 3: UPDATE Investment Manager Role
        INSERT INTO fund_permission
            ("name", "description", "access_level", "fund_role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM fund_role WHERE name = 'Investment Manager') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM fund_permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM fund_permission
                                        WHERE fund_role_id IN (SELECT id
                                                            FROM fund_role
                                                            WHERE name IN ('Investment Manager')))) AS "newRoles";

        -- STEP 4: UPDATE Read Only + Investment Role
        INSERT INTO fund_permission
            ("name", "description", "access_level", "fund_role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM fund_role WHERE name = 'Read Only + Investments') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM fund_permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM fund_permission
                                        WHERE fund_role_id IN (SELECT id
                                                            FROM fund_role
                                                            WHERE name IN ('Read Only + Investments')))) AS "newRoles";

        -- STEP 5: UPDATE No Access Role
        INSERT INTO fund_permission
            ("name", "description", "access_level", "fund_role_id", "access_type")
        SELECT "name"
            , "description"
            , 'NONE' AS "access_level"
            , (SELECT id FROM fund_role WHERE name = 'No Access') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM fund_permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM fund_permission
                                        WHERE fund_role_id IN (SELECT id
                                                            FROM fund_role
                                                            WHERE name IN ('No Access')))) AS "newRoles";

        -- STEP 6: UPDATE Read Only + Grants Role
        INSERT INTO fund_permission
            ("name", "description", "access_level", "fund_role_id", "access_type")
        SELECT "name"
            , "description"
            , 'FULL' AS "access_level"
            , (SELECT id FROM fund_role WHERE name = 'Read Only + Grants') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM fund_permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM fund_permission
                                        WHERE fund_role_id IN (SELECT id
                                                            FROM fund_role
                                                            WHERE name IN ('Read Only + Grants')))) AS "newRoles";

        -- STEP 7: UPDATE Read Only Role
        INSERT INTO fund_permission
            ("name", "description", "access_level", "fund_role_id", "access_type")
        SELECT "name"
            , "description"
            , 'READ' AS "access_level"
            , (SELECT id FROM fund_role WHERE name = 'Read Only') AS "role_id"
            , "access_type"
        FROM (
            SELECT DISTINCT "name", "description", "access_type"
            FROM fund_permission
            WHERE "access_type" NOT IN (SELECT "access_type"
                                        FROM fund_permission
                                        WHERE fund_role_id IN (SELECT id
                                                            FROM fund_role
                                                            WHERE name IN ('Read Only')))) AS "newRoles";
        `);
    }

    // ignoring as we'd be reverting into bad data
    public async down(queryRunner: QueryRunner): Promise<void> {
        return Promise.resolve();
    }
}
