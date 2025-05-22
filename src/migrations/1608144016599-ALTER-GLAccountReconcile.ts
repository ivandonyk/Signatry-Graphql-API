import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERGLAccountReconcile1608144016599 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "gl_account_reconcile" RENAME TO "gl_account_reconciliation"'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "gl_account_reconciliation" RENAME TO "gl_account_reconcile"'
        );
    }
}
