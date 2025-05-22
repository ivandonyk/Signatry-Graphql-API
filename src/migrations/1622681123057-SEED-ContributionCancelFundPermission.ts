import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDCancelContributionFundPermission1622681123057 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO fund_permission (
                "name"
                , "description"
                , "access_type"
                , "fund_role_id" )
            SELECT 'Cancel Contribution' AS "name"
                , 'Ability to Cancel a Contribution' AS "description"
                , 'CONTRIBUTION_CANCEL' AS "access_type"
                , id AS "fund_role_id"
            FROM fund_role
        `);

        await queryRunner.query(`
            UPDATE fund_permission
                SET "access_level" = 'NONE'
            WHERE fund_role_id IN (
                SELECT "id"
                FROM fund_role
                WHERE "name" != 'Full Access'
                AND "enabled")
                AND "access_type" = 'CONTRIBUTION_CANCEL'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DELETE FROM fund_permission WHERE "access_type" = \'CONTRIBUTION_CANCEL\''
        );
    }
}
