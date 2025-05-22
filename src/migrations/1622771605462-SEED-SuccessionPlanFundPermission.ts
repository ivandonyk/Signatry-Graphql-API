import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDSuccessionPlanFundPermission1622771605462 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO fund_permission (
                "name"
                , "description"
                , "access_type"
                , "fund_role_id" )
            SELECT 'Succession Plan' AS "name"
                , 'Ability to access fund succession plan' AS "description"
                , 'SUCCESSION_PLAN' AS "access_type"
                , id AS "fund_role_id"
            FROM fund_role
        `);

        await queryRunner.query(`
            UPDATE fund_permission
                SET "access_level" = 'READ'
            WHERE fund_role_id IN (
                SELECT "id"
                FROM fund_role
                WHERE "name" != 'Full Access'
                AND "enabled")
                AND "access_type" = 'SUCCESSION_PLAN'
        `);

        await queryRunner.query(`
            UPDATE fund_permission
                set "access_level" = 'NONE'
            WHERE fund_role_id IN (
                SELECT "id"
                FROM fund_role
                WHERE "name" = 'No Access'
                AND "enabled")
                AND "access_type" = 'SUCCESSION_PLAN'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DELETE FROM fund_permission WHERE "access_type" = \'SUCCESSION_PLAN\''
        );
    }
}
