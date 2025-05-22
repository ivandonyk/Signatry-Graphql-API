import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDReconcilliationComments1611694510357 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE TABLE reconciliation_comment (
                id uuid NOT NULL DEFAULT uuid_generate_v4(), 
                created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                created_by uuid NULL, 
                updated_by uuid NULL,
                gl_account_reconciliation_id uuid NOT NULL,
                version integer NOT NULL DEFAULT 1,
                enabled boolean NOT NULL DEFAULT true,
                comment_text text NOT NULL,
                CONSTRAINT PK_ReconciliationCommentId PRIMARY KEY (id)
            );
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE reconciliation_comment ADD CONSTRAINT FK_Reconciliation_ID FOREIGN KEY (gl_account_reconciliation_id) REFERENCES gl_account_reconciliation(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE reconciliation_comment DROP CONSTRAINT FK_Reconciliation_ID;
        `);

        await queryRunner.query(/* sql */ `
            DROP TABLE reconciliation_comment
        `);
    }
}
