import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATEAccountRole1590605635070 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TYPE tenant_account_type_name AS ENUM ('PRIMARY', 'POOL_PASSTHROUGH')`
        );

        await queryRunner.query(
        `CREATE TABLE "tenant_account_type" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" tenant_account_type_name NOT NULL,
        "label" character varying NOT NULL,
        "description" character varying,
        "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "version" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_AccountRoleId" PRIMARY KEY ("id")
        )`
        );

        await queryRunner.query(
            `INSERT INTO "tenant_account_type" ("type", "label", "description")
            VALUES ('PRIMARY', 'Primary', 'Primary account. Receives contributions, pays out grants.')`
        );
        await queryRunner.query(
            `INSERT INTO "tenant_account_type" ("type", "label", "description")
            VALUES ('POOL_PASSTHROUGH', 'Pool passthrough', 'Pool passthrough/intermediary account. Receives contribution batches, pays out to investment pools, receives contribution batches')`
        );

        queryRunner.query(
            `CREATE TABLE "tenant_account_account_type" (
            "tenant_account_id" uuid NOT NULL,
            "tenant_account_type_id" uuid NOT NULL,
            CONSTRAINT "FK_TenantAccountTypeId" FOREIGN KEY ("tenant_account_type_id") REFERENCES "tenant_account_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_TenantAccountId" FOREIGN KEY ("tenant_account_id") REFERENCES "tenant_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION 
            )`
        );
        
        await queryRunner.query(
            `INSERT INTO "tenant_account_account_type" ("tenant_account_id", "tenant_account_type_id")
             SELECT "tenant_account"."id", "type"."id" FROM "tenant_account",
                (SELECT "id" FROM "tenant_account_type" WHERE "type" = 'PRIMARY') "type"
            `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "tenant_account_type"`);
        await queryRunner.query(`DROP TABLE "tenant_account_account_type"`);
    }

}
