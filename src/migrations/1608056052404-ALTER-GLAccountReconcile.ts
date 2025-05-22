import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERGLAccountReconcile1608056052404 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE "gl_account_reconcile" ADD COLUMN "version" integer NOT NULL DEFAULT 1
        `);

        await queryRunner.query(
            'ALTER TABLE "gl_account_reconcile" ADD COLUMN "enabled" boolean NOT NULL DEFAULT true'
        );

        await queryRunner.query(
            'ALTER TABLE "gl_account_reconcile" ADD COLUMN "unreconciled_count" integer NOT NULL DEFAULT 0'
        );

        await queryRunner.query(
            'ALTER TABLE "gl_account_reconcile" ADD COLUMN "unreconciled_amount" float NOT NULL DEFAULT 0'
        );

        await queryRunner.query(
            'ALTER TABLE "gl_account_reconcile" ADD COLUMN "change" float NOT NULL DEFAULT 0'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "gl_account_reconcile" DROP COLUMN "enabled"');

        await queryRunner.query('ALTER TABLE "gl_account_reconcile" DROP COLUMN "version"');

        await queryRunner.query(
            'ALTER TABLE "gl_account_reconcile" DROP COLUMN "unreconciled_count"'
        );

        await queryRunner.query(
            'ALTER TABLE "gl_account_reconcile" DROP COLUMN "unreconciled_amount"'
        );

        await queryRunner.query('ALTER TABLE "gl_account_reconcile" DROP COLUMN "change"');
    }
}
