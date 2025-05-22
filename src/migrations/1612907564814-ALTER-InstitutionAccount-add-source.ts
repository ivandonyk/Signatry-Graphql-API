import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInstitutionAccountAddSource1612907564814 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "account_provider" AS ENUM ('BAA', 'PLAID')`);
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" ADD COLUMN "provider" account_provider NOT NULL DEFAULT 'BAA'`);
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" ALTER COLUMN "institution_account_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" ADD COLUMN "tenant_account_id" uuid NULL`);
        await queryRunner.query(`
            ALTER TABLE "institution_account_transaction" 
            ADD CONSTRAINT "FK_TenantAccountId" 
            FOREIGN KEY ("tenant_account_id") REFERENCES "tenant_account"("id")
        `);
        await queryRunner.query(`
            ALTER TABLE "institution_account_transaction" 
            ADD CONSTRAINT "FK_TenantOrInstitutionAccountId" 
                CHECK (
                    (CASE WHEN "tenant_account_id" IS NULL THEN 0 ELSE 1 END
                    + CASE WHEN "institution_account_id" IS NULL THEN 0 ELSE 1 END
                    ) = 1
                )
        `);
        await queryRunner.query(`
            ALTER TABLE "institution_account_transaction" 
            ADD CONSTRAINT "UNQ_TransactionId" 
            UNIQUE ("provider", "transaction_id")
        `);
     
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" DROP CONSTRAINT "FK_TenantOrInstitutionAccountId"`);
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" DROP COLUMN "tenant_account_id"`);
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" ALTER COLUMN "institution_account_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "institution_account_transaction" DROP COLUMN "provider"`);
        await queryRunner.query(`DROP TYPE "account_provider"`);
    }

}
