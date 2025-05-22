import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERGLAccountReconciliation1609714558165 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "batch" DROP CONSTRAINT "FK_GlAccountReconciliationId"`
        );
        await queryRunner.query(`ALTER TABLE "batch" DROP COLUMN "gl_account_reconciliation_id"`);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "institution_account_transaction" ADD COLUMN "gl_account_reconciliation_id" uuid NULL
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "institution_account_transaction" ADD CONSTRAINT "FK_GlAccountReconciliationId" FOREIGN KEY ("gl_account_reconciliation_id") REFERENCES "gl_account_reconciliation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "institution_account_transaction" DROP CONSTRAINT "FK_GlAccountReconciliationId"`
        );
        await queryRunner.query(
            `ALTER TABLE "institution_account_transaction" DROP COLUMN "gl_account_reconciliation_id"`
        );
    }
}
