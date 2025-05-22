import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERReconciliationComment1611843686527 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DELETE FROM "reconciliation_comment"');

        await queryRunner.query(
            'ALTER TABLE "reconciliation_comment" ADD COLUMN "gl_account_id" uuid NOT NULL'
        );

        await queryRunner.query(/* sql */ `
            ALTER TABLE "reconciliation_comment" ADD CONSTRAINT FK_GlAccountId FOREIGN KEY (gl_account_id) REFERENCES gl_account(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE "reconciliation_comment" DROP CONSTRAINT FK_GlAccountId;
        `);

        await queryRunner.query('ALTER TABLE "reconciliation_comment" DROP COLUMN "gl_account_id"');
    }
}
