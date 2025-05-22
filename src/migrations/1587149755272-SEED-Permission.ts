import { MigrationInterface, QueryRunner } from 'typeorm';

export class SEEDPermission1587149755272 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('USER_DEFAULTS', 'Access to all features under fund dashboard, contribution summary, granting summary, and profile tabs')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_DEFAULTS', 'Access to the Administrator controls')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_CONTRIBUTIONS', 'Access to the contributions tab in the administrator controls')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_INVESTMENTS', 'Access to the investments tab in the administrator controls')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_DIVESTMENTS', 'Access to the divestments tab in the administrator controls')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_GRANT_RECS', 'Access to the grant recs tab in the administrator controls')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_TOTALS', 'Access to the investment totals and the divestment totals secions')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_BATCH_SUBMIT', 'Ability to submit batches of investments and divestments for finalization')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_BATCH_FINALIZE', 'Ability to finalize the reconciliation of batches')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_UNIT_PRICES_READONLY', 'Access to view unit prices')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_UNIT_ADJUST', 'Ability to adjust unit prices')"
        );
        await queryRunner.query(
            "INSERT INTO permission(name, description) VALUES ('ADMIN_TENANT_FUNDING_SOURCES', 'Ability to add or remove funding sources')"
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DELETE FROM "permission"');
    }
}
