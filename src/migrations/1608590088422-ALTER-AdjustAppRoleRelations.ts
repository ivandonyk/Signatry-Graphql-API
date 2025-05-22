import { RoleTypeValues } from '../models/Role';
import { PermissionAccessType } from '../models/Permission';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { statusFormatter } from '../utilities/format';

export class ALTERAdjustAppRoleRelations1608590088422 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop old data
        await queryRunner.query(/* sql */ `
            DROP TABLE "role_permission";
        `);
        await queryRunner.query(/* sql */ `
            DELETE FROM "permission";
        `);
        await queryRunner.query(/* sql */ `
            DELETE FROM "invitation";
        `);
        await queryRunner.query(/* sql */ `
            DELETE FROM "user_profile_role";
        `);
        await queryRunner.query(/* sql */ `
            DELETE FROM "role";
        `);

        // Create new enums
        await queryRunner.query(/* sql */ `
            CREATE TYPE permission_access_level AS ENUM ('FULL', 'READ', 'NONE');
        `);
        await queryRunner.query(/* sql */ `
            CREATE TYPE permission_access_type AS ENUM (${Object.keys(PermissionAccessType)
                .map(type => `'${type}'`)
                .join(', ')});
        `);

        // Alter tables
        await queryRunner.query(/* sql */ `
            ALTER TABLE "permission" ADD COLUMN "access_level" permission_access_level NOT NULL DEFAULT 'FULL';
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "permission" ADD COLUMN "access_type" permission_access_type NOT NULL DEFAULT '${PermissionAccessType.ADMIN_FUNDS}';
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "permission" ADD COLUMN "role_id" uuid NOT NULL;
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "permission" ADD CONSTRAINT "FK_Permission_Role" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        `);

        // Seeds
        // _MASTER - Used for spawning new roles. Unused by app.
        const [{ id: masterId }] = await queryRunner.query(`
            INSERT INTO "role" ("name", "enabled", "description") VALUES ('${RoleTypeValues._MASTER}', false, 'Unused Master, used for spawning new roles') RETURNING id;
        `);
        for (const value of Object.values(PermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "permission" ("name", "description", "access_type", "access_level", "role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'FULL', '${masterId}');
            `);
        }

        // DONOR - Basic user, no admin permissions
        const [{ id: donorId }] = await queryRunner.query(`
            INSERT INTO "role" ("name", "enabled", "description") VALUES ('${RoleTypeValues.DONOR}', true, 'Donor, regular user, no admin privileges') RETURNING id;
        `);
        for (const value of Object.values(PermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "permission" ("name", "description", "access_type", "access_level", "role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'NONE', '${donorId}');
            `);
        }

        // Staff Basic - minimal admin privileges
        const [{ id: basicId }] = await queryRunner.query(`
            INSERT INTO "role" ("name", "enabled", "description") VALUES ('${RoleTypeValues.STAFF_BASIC}', true, 'Staff Basic, entry level admin') RETURNING id;
        `);
        for (const value of Object.values(PermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "permission" ("name", "description", "access_type", "access_level", "role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'NONE', '${basicId}');

            `);
        }
        await queryRunner.query(/* sql */ `
            UPDATE "permission" SET "access_level" = 'READ' WHERE "access_type" IN (
                '${PermissionAccessType.ADMIN_FUNDS}',
                '${PermissionAccessType.ADMIN_RECIPIENTS}'
            ) AND "id" = '${basicId}';
        `);

        // Staff Plus - CRUD for funds, contacts, grants, and reconciliation
        const [{ id: plusId }] = await queryRunner.query(`
            INSERT INTO "role" ("name", "enabled", "description") VALUES ('${RoleTypeValues.STAFF_PLUS}', true, 'Staff Plus, editing of funds, contacts, reconciliation') RETURNING id;
        `);
        for (const value of Object.values(PermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "permission" ("name", "description", "access_type", "access_level", "role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'NONE', '${plusId}');

            `);
        }
        await queryRunner.query(/* sql */ `
            UPDATE "permission" SET "access_level" = 'FULL' WHERE "access_type" IN (
                '${PermissionAccessType.ADMIN_FUNDS}',
                '${PermissionAccessType.ADMIN_RECIPIENTS}',
                '${PermissionAccessType.ADMIN_GRANTS}',
                '${PermissionAccessType.ADMIN_RECONCILIATION}'
            ) AND "id" = '${plusId}';
        `);

        // Staff Finance - CRUD for finance stuff, more or less Staff basic otherwise
        const [{ id: financeId }] = await queryRunner.query(`
            INSERT INTO "role" ("name", "enabled", "description") VALUES ('${RoleTypeValues.STAFF_FINANCE}', true, 'Staff Finance, full finance access, otherwise similar to Staff Basic') RETURNING id;
        `);
        for (const value of Object.values(PermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "permission" ("name", "description", "access_type", "access_level", "role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'FULL', '${financeId}');

            `);
        }
        await queryRunner.query(/* sql */ `
            UPDATE "permission" SET "access_level" = 'READ' WHERE "access_type" IN (
                '${PermissionAccessType.ADMIN_FUNDS}',
                '${PermissionAccessType.ADMIN_RECIPIENTS}',
                '${PermissionAccessType.ADMIN_GRANTS}'
            ) AND "id" = '${financeId}';
        `);
        await queryRunner.query(/* sql */ `
            UPDATE "permission" SET "access_level" = 'NONE' WHERE "access_type" IN (
                '${PermissionAccessType.ADMIN_GRANT_FINALIZE}'
            ) AND "id" = '${financeId}';
        `);

        // Staff Finance Executive - Full access, except for Grants
        const [{ id: executiveId }] = await queryRunner.query(`
            INSERT INTO "role" ("name", "enabled", "description") VALUES ('${RoleTypeValues.STAFF_FINANCE_EXECUTIVE}', true, 'Staff Finance Executive, full access except for grants') RETURNING id;
        `);
        for (const value of Object.values(PermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "permission" ("name", "description", "access_type", "access_level", "role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'FULL', '${executiveId}');

            `);
        }
        await queryRunner.query(/* sql */ `
            UPDATE "permission" SET "access_level" = 'READ' WHERE "access_type" IN (
                '${PermissionAccessType.ADMIN_GRANTS}'
            ) AND "id" = '${executiveId}';
        `);
        await queryRunner.query(/* sql */ `
            UPDATE "permission" SET "access_level" = 'NONE' WHERE "access_type" IN (
                '${PermissionAccessType.ADMIN_GRANT_FINALIZE}'
            ) AND "id" = '${executiveId}';
        `);

        // Staff Admin- Full access, except for special approval, reconciliation
        const [{ id: staffAdminId }] = await queryRunner.query(`
            INSERT INTO "role" ("name", "enabled", "description") VALUES ('${RoleTypeValues.STAFF_ADMIN}', true, 'Staff Admin, full access except for special approval, reconciliation') RETURNING id;
        `);
        for (const value of Object.values(PermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "permission" ("name", "description", "access_type", "access_level", "role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'FULL', '${staffAdminId}');

            `);
        }
        await queryRunner.query(/* sql */ `
            UPDATE "permission" SET "access_level" = 'READ' WHERE "access_type" IN (
                '${PermissionAccessType.ADMIN_RECONCILIATION}'
            ) AND "id" = '${staffAdminId}';
        `);

        // GLOBAL ADMIN - Global Admin (super admin). All access.
        const [{ id: globalId }] = await queryRunner.query(`
            INSERT INTO "role" ("name", "enabled", "description") VALUES ('${RoleTypeValues.GLOBAL_ADMIN}', true, 'Global Admin, (super admin). All Priveleges.') RETURNING id;
        `);
        for (const value of Object.values(PermissionAccessType)) {
            const nameString = statusFormatter(value);
            await queryRunner.query(`
                INSERT INTO "permission" ("name", "description", "access_type", "access_level", "role_id") VALUES ('${nameString}', '${nameString}', '${value}', 'FULL', '${globalId}');
            `);
        }

        // Cleanup
        // Ensure all USER_DEFAULTS are enabled.
        await queryRunner.query(/* sql */ `
            UPDATE "permission" SET "access_level" = 'FULL' WHERE "access_type" = '${PermissionAccessType.USER_DEFAULTS}';
        `);

        // Set all users to global admins
        await queryRunner.query(/* sql */ `
            INSERT INTO "user_profile_role" ("role_id", "user_profile_id") SELECT '${globalId}', "user_profile"."id" FROM "user_profile"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "permission" DROP CONSTRAINT "FK_Permission_Role";
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "permission" DROP COLUMN "role_id";
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "permission" DROP COLUMN "access_level";
        `);
        await queryRunner.query(/* sql */ `
            ALTER TABLE "permission" DROP COLUMN "access_type";
        `);
        await queryRunner.query(/* sql */ `
            DROP TYPE IF EXISTS permission_access_level;
        `);
        await queryRunner.query(/* sql */ `
            DROP TYPE IF EXISTS permission_access_type;
        `);

        await queryRunner.query(
            `CREATE TABLE "role_permission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "role_id" uuid NOT NULL,
            "permission_id" uuid NOT NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_RolePermissionId" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            'ALTER TABLE "role_permission" ADD CONSTRAINT "FK_Role_RolePermission" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
        await queryRunner.query(
            'ALTER TABLE "role_permission" ADD CONSTRAINT "FK_Permission_RolePermission" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION'
        );
    }
}
