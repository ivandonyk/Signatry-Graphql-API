import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundPermissionUseGrantCancel1619544684117 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // INSERT new GRANT_CANCEL permission for all roles
        await queryRunner.query(`
        INSERT INTO fund_permission (
            "name"
            , "description"
            , "access_type"
            , "fund_role_id" )
        SELECT 'Cancel Grant' AS "name"
            , 'Ability to Cancel a Grant' AS "description"
            , 'GRANT_CANCEL' AS "access_type"
            , id AS "fund_role_id"
        FROM fund_role
        `);

        // UPDATE setting per role
        await queryRunner.query(`
        UPDATE fund_permission
            SET "access_level" = 'NONE'
        WHERE fund_role_id IN (
            SELECT "id"
            FROM fund_role
            WHERE "name" NOT IN ('Full Access', 'Read Only + Grants')
            AND "enabled")
            AND "access_type" = 'GRANT_CANCEL'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DELETE FROM fund_permission WHERE "access_type" = \'GRANT_CANCEL\''
        );
    }
}
