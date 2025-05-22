import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERHoldingAddProvider1613066037457 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holding" ADD COLUMN "provider" account_provider NOT NULL DEFAULT 'BAA'`);
        await queryRunner.query(`ALTER TABLE "holding" ALTER COLUMN "institution_account_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "holding" ADD COLUMN "tenant_account_id" uuid NULL`);
        await queryRunner.query(`
            ALTER TABLE "holding" 
            ADD CONSTRAINT "FK_TenantAccountId" 
            FOREIGN KEY ("tenant_account_id") REFERENCES "tenant_account"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "holding" 
            ADD CONSTRAINT "FK_TenantOrInstitutionAccountId" 
                CHECK (
                    (CASE WHEN "tenant_account_id" IS NULL THEN 0 ELSE 1 END
                    + CASE WHEN "institution_account_id" IS NULL THEN 0 ELSE 1 END
                    ) = 1
                )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "holding" DROP CONSTRAINT "FK_TenantOrInstitutionAccountId"`);
        await queryRunner.query(`ALTER TABLE "holding" DROP COLUMN "tenant_account_id"`);
        await queryRunner.query(`ALTER TABLE "holding" ALTER COLUMN "institution_account_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "holding" DROP COLUMN "provider"`);
    }

}
