import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATEGLAccount1594331085716 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "location_entity" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "tenant_id" uuid NOT NULL,
            "location_id" character varying NOT NULL,
            "name" character varying NOT NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "PK_EntityId" PRIMARY KEY ("id"),
            CONSTRAINT "FK_TenantId" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )`
        );

        await queryRunner.query(
            `CREATE TABLE "gl_account" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "tenant_id" uuid NOT NULL,
            "account_number" character varying NOT NULL,
            "title" character varying NOT NULL,
            "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "PK_GlAccountId" PRIMARY KEY ("id"),
            CONSTRAINT "FK_TenantId" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )`
        );

        await queryRunner.query(
            `CREATE TABLE "tenant_account_gl_account" (
            "tenant_account_id" uuid NOT NULL,
            "gl_account_id" uuid NOT NULL,
            CONSTRAINT "FK_TenantId" FOREIGN KEY ("tenant_account_id") REFERENCES "tenant_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_GlAccountId" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )`
        );

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`DROP TABLE "tenant_account_gl_account"`);
        queryRunner.query(`DROP TABLE "gl_account"`);
        queryRunner.query(`DROP TABLE "location_entity"`);
    }

}
