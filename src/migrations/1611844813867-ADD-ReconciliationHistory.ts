import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDReconciliationHistory1611844813867 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE TABLE reconciliation_history (
                id uuid NOT NULL DEFAULT uuid_generate_v4(), 
                created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                updated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
                created_by uuid NULL, 
                updated_by uuid NULL,
                gl_account_reconciliation_id uuid NOT NULL,
                gl_account_id uuid NOT NULL,
                version integer NOT NULL DEFAULT 1,
                enabled boolean NOT NULL DEFAULT true,
                action text NOT NULL,
                transaction_count integer NOT NULL DEFAULT 0,
                total_amount float NOT NULL DEFAULT 0,
                CONSTRAINT PK_ReconciliationHistoryId PRIMARY KEY (id)
            );
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE reconciliation_history ADD CONSTRAINT FK_Reconciliation_ID FOREIGN KEY (gl_account_reconciliation_id) REFERENCES gl_account_reconciliation(id) ON DELETE NO ACTION ON UPDATE NO ACTION; 
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE reconciliation_history ADD CONSTRAINT FK_Gl_Account_ID FOREIGN KEY (gl_account_id) REFERENCES gl_account(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            ALTER TABLE reconciliation_history DROP CONSTRAINT FK_Reconciliation_ID;
        `);

        await queryRunner.query(/* sql */ `
            ALTER TABLE reconciliation_history DROP CONSTRAINT FK_Gl_Account_ID;
        `);

        await queryRunner.query(/* sql */ `
            DROP TABLE reconciliation_history
        `);
    }
}
