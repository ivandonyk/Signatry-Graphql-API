import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATEFundRole1601672391711 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "fund_role" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "enabled" boolean NOT NULL DEFAULT true,
            "created_on" timestamp NOT NULL DEFAULT current_timestamp,
            "created_by" uuid NULL,
            "updated_on" timestamp NOT NULL DEFAULT current_timestamp,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundRoleId" PRIMARY KEY ("id")
            )`);
        await queryRunner.query(`
            CREATE TABLE "fund_permission" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying NOT NULL,
            "description" character varying NOT NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "created_by" uuid NULL,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_by" uuid NULL,
            "version" integer NOT NULL DEFAULT 1,
            CONSTRAINT "PK_FundPermissionId" PRIMARY KEY ("id")
            )`);
        await queryRunner.query(`
            CREATE TABLE "fund_role_permission" (
            "fund_role_id" uuid NOT NULL,
            "fund_permission_id" uuid NOT NULL,
            CONSTRAINT "FK_FundRoleId" FOREIGN KEY ("fund_role_id") REFERENCES "fund_role"("id"),
            CONSTRAINT "FK_FundPermissionId" FOREIGN KEY ("fund_permission_id") REFERENCES "fund_permission"("id")
        )`);
        await queryRunner.query(`ALTER TABLE "fund_user_profile" ADD COLUMN "fund_role_id" uuid`);
        await queryRunner.query(`ALTER TABLE "fund_user_profile" ADD CONSTRAINT "FK_FundRoleId" FOREIGN KEY ("fund_role_id") REFERENCES "fund_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO "fund_role" ("name") VALUES ('FINANCIAL_ADVISOR'), ('DONOR'), ('GRANTOR'), ('OWNER')`);
        await queryRunner.query(`
        INSERT INTO "fund_permission" ("name", "description") VALUES 
            ('CONTRIBUTE', 'Allowed to contribute to a fund'), 
            ('GRANT', 'Allowed to grant from a fund'),
            ('GRANT_VIEW', 'Allowed to view grants'),
            ('CONTRIBUTE_VIEW', 'Allowed to view contributions')
        `);
        await queryRunner.query(`
        INSERT INTO "fund_role_permission" ("fund_role_id", "fund_permission_id") 
        SELECT fr.id, fp.id FROM
            (SELECT "id" FROM "fund_role" WHERE "name" = 'OWNER') fr 
            CROSS JOIN 
            (SELECT "id" FROM "fund_permission") fp
        `);
        await queryRunner.query(`
        INSERT INTO "fund_role_permission" ("fund_role_id", "fund_permission_id") 
        SELECT fr.id, fp.id FROM
            (SELECT "id" FROM "fund_role" WHERE "name" = 'FINANCIAL_ADVISOR') fr 
            CROSS JOIN 
            (SELECT "id" FROM "fund_permission" WHERE "name" IN ('GRANT_VIEW', 'CONTRIBUTE_VIEW')) fp
        `);
        await queryRunner.query(`
        INSERT INTO "fund_role_permission" ("fund_role_id", "fund_permission_id") 
        SELECT fr.id, fp.id FROM
            (SELECT "id" FROM "fund_role" WHERE "name" = 'DONOR') fr 
            CROSS JOIN 
            (SELECT "id" FROM "fund_permission" WHERE "name" IN ('CONTRIBUTE_VIEW', 'CONTRIBUTE')) fp
        `);
        await queryRunner.query(`
        INSERT INTO "fund_role_permission" ("fund_role_id", "fund_permission_id") 
        SELECT fr.id, fp.id FROM
            (SELECT "id" FROM "fund_role" WHERE "name" = 'GRANTOR') fr 
            CROSS JOIN 
            (SELECT "id" FROM "fund_permission" WHERE "name" IN ('GRANT_VIEW', 'GRANT')) fp
        `);
        await queryRunner.query(`UPDATE "fund_user_profile" SET "fund_role_id" = (
            SELECT "id" FROM "fund_role" WHERE "name" = 'OWNER'
            )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fund_user_profile" DROP CONSTRAINT "FK_FundRoleId"`);
        await queryRunner.query(`ALTER TABLE "fund_user_profile" DROP COLUMN "fund_role_id"`);
        await queryRunner.query(`DROP TABLE "fund_role_permission"`);
        await queryRunner.query(`DROP TABLE "fund_permission"`);
        await queryRunner.query(`DROP TABLE "fund_role"`);
    }
}
