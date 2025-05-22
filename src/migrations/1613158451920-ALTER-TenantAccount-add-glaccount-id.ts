import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERTenantAccountAddGlaccountId1613158451920 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_account" ADD COLUMN "gl_account_id" uuid`);
        await queryRunner.query(`ALTER TABLE "tenant_account" ADD COLUMN "name" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant_account" ADD COLUMN "mask" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant_account" ADD COLUMN "institution_name" character varying`);
        await queryRunner.query(`ALTER TABLE "tenant_account" ADD CONSTRAINT "FK_TenantAccountId"
            FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id")`);
        await queryRunner.query(`UPDATE "tenant_account" SET "gl_account_id" = (
        SELECT "gl_account_id" FROM "gl_account_tenant_account" 
        WHERE "tenant_account_id" = "tenant_account"."id"
        )`);
        await queryRunner.query(`DROP TABLE "gl_account_tenant_account"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "gl_account_tenant_account" (
                "gl_account_id" uuid NOT NULL,
                "tenant_account_id" uuid NOT NULL,
                CONSTRAINT "FK_GLAccountId" FOREIGN KEY ("gl_account_id") REFERENCES "gl_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_TenantAccountId" FOREIGN KEY ("tenant_account_id") REFERENCES "tenant_account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`INSERT INTO "gl_account_tenant_account" 
            ("tenant_account_id", "gl_account_id") 
            SELECT "id", "gl_account_id" FROM "tenant_account" 
            WHERE "gl_account_id" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant_account" DROP COLUMN "gl_account_id"`);
        await queryRunner.query(`ALTER TABLE "tenant_account" DROP COLUMN "institution_name"`);
        await queryRunner.query(`ALTER TABLE "tenant_account" DROP COLUMN "name"`);
    }

}
