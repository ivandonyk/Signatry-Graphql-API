import { MigrationInterface, QueryRunner } from 'typeorm';
import { statusFormatter } from '../utilities/format';
import { FundRole, FundRoleNameValues } from '../models/FundRole';

enum FundPermissionAccessType {
    DASHBOARD = 'DASHBOARD',
    ROLES_AND_PERMISSIONS = 'ROLES_AND_PERMISSIONS',
    LINK_DONOR_FUNDING_ACCOUNT = 'LINK_DONOR_FUNDING_ACCOUNT',
    INITIATE_CONTRIBUTION = 'INITIATE_CONTRIBUTION',
    CONTRIBUTION_SUMMARY = 'CONTRIBUTION_SUMMARY',
    CONTRIBUTION_DETAIL = 'CONTRIBUTION_DETAIL',
    EXPORT_CONTRIBUTION_TABLE = 'EXPORT_CONTRIBUTION_TABLE',
    FUND_TO_FUND_TRANSFERS = 'FUND_TO_FUND_TRANSFERS',
    INVESTMENT_INSTRUCTIONS = 'INVESTMENT_INSTRUCTIONS',
    DIVESTMENT_INSTRUCTIONS = 'DIVESTMENT_INSTRUCTIONS',
    REALLOCATE_INVESTMENTS = 'REALLOCATE_INVESTMENTS',
    REBALANCE_INVESTMENTS = 'REBALANCE_INVESTMENTS',
    TRANSACTION_DETAIL = 'TRANSACTION_DETAIL',
    DOCUMENT_SETTINGS = 'DOCUMENT_SETTINGS',
    RECOMMEND_A_GRANT = 'RECOMMEND_A_GRANT',
    VIEW_GRANTS_DASHBOARD = 'VIEW_GRANTS_DASHBOARD',
    GRANT_DETAIL = 'GRANT_DETAIL',
    EXPORT_GRANT_TABLE = 'EXPORT_GRANT_TABLE',
    GRANT_NOW_CTA = 'GRANT_NOW_CTA',
    REQUEST_IMA = 'REQUEST_IMA',
    INVESTMENT_SETTINGS = 'INVESTMENT_SETTINGS',
    FUND_NAME = 'FUND_NAME',
    FUND_DETAILS = 'FUND_DETAILS',
    FUND_PURPOSE = 'FUND_PURPOSE',
    LIQUIDATION_REQUESTS = 'LIQUIDATION_REQUESTS'
}

export class ALTERAdjustFundRoleRelations1607622606219 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Alterations to table structure
        await queryRunner.query(/* sql */ `
            DROP TABLE "fund_role_permission";
        `);
        await queryRunner.query(/* sql */ `
            DELETE FROM "fund_permission";
        `);

        await queryRunner.query('ALTER TABLE "fund_user_profile" DROP CONSTRAINT "FK_FundRoleId"');

        await queryRunner.query(/* sql */ `
            DELETE FROM "fund_role";
        `);
        await queryRunner.query(/* sql */ `
            CREATE TYPE fund_permission_access_level AS ENUM ('FULL', 'READ', 'NONE');
        `);
        await queryRunner.query(`
            CREATE TYPE fund_permission_access_type AS ENUM (${Object.keys(FundPermissionAccessType)
                .map(type => `'${type}'`)
                .join(', ')});
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_permission" ADD COLUMN "access_level" fund_permission_access_level NOT NULL DEFAULT 'FULL';
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_permission" ADD COLUMN "access_type" fund_permission_access_type NOT NULL DEFAULT 'DASHBOARD';
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_permission" ADD COLUMN "fund_role_id" uuid NOT NULL;
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_permission" ADD CONSTRAINT "FK_FundPermission_FundRole" FOREIGN KEY ("fund_role_id") REFERENCES "fund_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        `);

        // Seeds

        // _MASTER - this is going to be disabled, and used just for spawning new fund_roles
        const [{ id: masterId }] = await queryRunner.query(`
            INSERT INTO "fund_role" ("name", "enabled") VALUES ('${FundRoleNameValues._MASTER}', false) RETURNING id;
        `);

        for (const value of Object.values(FundPermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "fund_permission" ("name", "description", "access_type", "access_level", "fund_role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'FULL', '${masterId}');
            `);
        }

        // FULL_ACCESS - this is for admins
        const [{ id: fullAccessId }] = await queryRunner.query(`
            INSERT INTO "fund_role" ("name", "enabled") VALUES ('${FundRoleNameValues.FULL_ACCESS}', true) RETURNING id;
        `);

        for (const value of Object.values(FundPermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "fund_permission" ("name", "description", "access_type", "access_level", "fund_role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'FULL', '${fullAccessId}');
            `);
        }

        // READ_ONLY - Tal, this is just an example. I would suggest doing something similar for all the other roles
        const [{ id: readOnlyId }] = await queryRunner.query(`
            INSERT INTO "fund_role" ("name", "enabled") VALUES ('${FundRoleNameValues.READ_ONLY}', true) RETURNING id;
        `);

        for (const value of Object.values(FundPermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "fund_permission" ("name", "description", "access_type", "access_level", "fund_role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'READ', '${readOnlyId}');
            `);
        }

        await queryRunner.query(/* sql */ `
            UPDATE "fund_permission"
            SET    "access_level" = 'FULL'
            WHERE  "access_type" IN (
                        '${FundPermissionAccessType.LINK_DONOR_FUNDING_ACCOUNT}',
                        '${FundPermissionAccessType.INITIATE_CONTRIBUTION}',
                                    '${FundPermissionAccessType.EXPORT_CONTRIBUTION_TABLE}',
                        '${FundPermissionAccessType.EXPORT_GRANT_TABLE}' )
                AND "id" = '${readOnlyId}';  
        `);

        await queryRunner.query(`
            UPDATE "fund_user_profile" SET "fund_role_id" = '${fullAccessId}';
        `);

        await queryRunner.query(
            'ALTER TABLE "fund_user_profile" ADD CONSTRAINT "FK_FundRoleId" FOREIGN KEY ("fund_role_id") REFERENCES "fund_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_permission" DROP CONSTRAINT "FK_FundPermission_FundRole";
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_permission" DROP COLUMN "fund_role_id";
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_permission" DROP COLUMN "access_level";
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "fund_permission" DROP COLUMN "access_type";
        `);
        await queryRunner.query(/* sql */ `
            DROP TYPE IF EXISTS fund_permission_access_level;
        `);
        await queryRunner.query(/* sql */ `
            DROP TYPE IF EXISTS fund_permission_access_type;
        `);
        await queryRunner.query(/* sql */ `
            CREATE TABLE "fund_role_permission" (
                "fund_role_id" uuid NOT NULL,
                "fund_permission_id" uuid NOT NULL,
                CONSTRAINT "FK_FundRoleId" FOREIGN KEY ("fund_role_id") REFERENCES "fund_role"("id"),
                CONSTRAINT "FK_FundPermissionId" FOREIGN KEY ("fund_permission_id") REFERENCES "fund_permission"("id")
            );
        `);
    }
}
