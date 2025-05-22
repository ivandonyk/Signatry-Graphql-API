import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERGLAccountReconciliationTransactions1608830901731 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "batch" ADD COLUMN "gl_account_reconciliation_id" uuid NULL
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE "batch" ADD CONSTRAINT "FK_GlAccountReconciliationId" FOREIGN KEY ("gl_account_reconciliation_id") REFERENCES "gl_account_reconciliation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(
            `ALTER TABLE "institution_account_transaction" ADD COLUMN "batch_id" uuid NULL`
        );

        await queryRunner.query(
            `ALTER TABLE "institution_account_transaction" ADD CONSTRAINT "FK_BatchId" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "batch" DROP CONSTRAINT "FK_GlAccountReconciliationId"`
        );
        await queryRunner.query(`ALTER TABLE "batch" DROP COLUMN "gl_account_reconciliation_id"`);

        await queryRunner.query(
            `ALTER TABLE "institution_account_transaction" DROP CONSTRAINT "FK_BatchId"`
        );
        await queryRunner.query(
            `ALTER TABLE "institution_account_transaction" DROP COLUMN "batch_id"`
        );
    }
}
