import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATEGLAccountType1597425702122 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Replace Tenant Account Type with GL Account Type
        await queryRunner.query('DROP TABLE "tenant_account_account_type"');
        await queryRunner.query('DROP TABLE "tenant_account_gl_account"');
        await queryRunner.query('DROP TABLE "tenant_account_type"');
        await queryRunner.query('DROP TYPE "tenant_account_type_name"');

        await queryRunner.query(`
            CREATE TYPE "gl_account_type_name" AS ENUM (
                'PRIMARY', 
                'CONTRIBUTION_REVENUE', 
                'POOL_PASSTHROUGH', 
                'INVESTMENT', 
                'GRANT_DISBURSEMENT', 
                'GRANT_RECIPIENT'
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "gl_account_type" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" gl_account_type_name UNIQUE NOT NULL,
                "label" character varying UNIQUE NOT NULL,
                "description" character varying NOT NULL,
                "created_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_on" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "version" integer NOT NULL DEFAULT 1,
                CONSTRAINT "PK_GLAccountId" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_GLAccountType_Name"
            ON "gl_account_type" 
            ("name")
        `);

        await queryRunner.query(`
            INSERT INTO "gl_account_type" ("name", "label", "description")
            VALUES 
            ('PRIMARY', 'Primary bank account', 'Primary accounts. Receives contributions.'),
            ('CONTRIBUTION_REVENUE', 'Contribution Revenue account', 'Tracks contribution revenue.'),
            ('POOL_PASSTHROUGH', 'Pool passthrough', 'Passthrough account. Receieves contributions before transfer to investments.'),
            ('INVESTMENT', 'Investment', 'Investment brokerage account.'),
            ('GRANT_DISBURSEMENT', 'Grant disbursement', 'Account out of which grants are paid.'),
            ('GRANT_RECIPIENT', 'Grant recipient', 'Tracks grant expenses.')
        `);

        await queryRunner.query(`
            CREATE TABLE "gl_account_account_type" (
                "gl_account_id" uuid NOT NULL,
                "gl_account_type_id" uuid NOT NULL,
                CONSTRAINT "FK_GLAccountId" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_GLAccountTypeId" FOREIGN KEY ("gl_account_type_id") REFERENCES "gl_account_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_GLAccount_GLAccountType"
            ON "gl_account_account_type"
            ("gl_account_id", "gl_account_type_id")
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_GLAccount_AccountNumber" 
            ON "gl_account" 
            ("account_number")
        `);

        await queryRunner.query(`
            CREATE TABLE "gl_account_tenant_account" (
                "gl_account_id" uuid NOT NULL,
                "tenant_account_id" uuid NOT NULL,
                CONSTRAINT "FK_GLAccountId" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_TenantAccountId" FOREIGN KEY ("tenant_account_id") REFERENCES "tenant_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_GLAccount_TenantAccount"
            ON "gl_account_tenant_account" 
            ("gl_account_id", "tenant_account_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE "gl_account_account_type"');
        await queryRunner.query('DROP TABLE "gl_account_type"');
        await queryRunner.query('DROP TABLE "gl_account_tenant_account"');
        await queryRunner.query('DROP TYPE IF EXISTS "gl_account_type_name"');
        await queryRunner.query(
            "CREATE TYPE tenant_account_type_name AS ENUM ('PRIMARY', 'POOL_PASSTHROUGH')"
        );

        await queryRunner.query(
            `CREATE TABLE "tenant_account_gl_account" (
            "tenant_account_id" uuid NOT NULL,
            "gl_account_id" uuid NOT NULL,
            CONSTRAINT "FK_TenantId" FOREIGN KEY ("tenant_account_id") REFERENCES "tenant_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
            CONSTRAINT "FK_GlAccountId" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )`
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

        await queryRunner.query(
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
}
