import { MigrationInterface, QueryRunner } from 'typeorm';

export class ADDGlAccountReconciliationView1612277613905 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE VIEW gl_account_reconciliation_view AS
                SELECT r.id,
                    COUNT(iat.id) as unreconciled_count,
                    coalesce(SUM(iat.amount), 0) as unreconciled_amount,
                    (coalesce(SUM(iat.amount), 0) * 100) / (CASE WHEN r.balance_open = 0 THEN 1 ELSE r.balance_open END) as change
                FROM gl_account_reconciliation r
                INNER JOIN institution_account ia ON ia.gl_account_id = r.gl_account_id
                LEFT JOIN institution_account_transaction iat ON iat.institution_account_id = ia.id
                WHERE 
                    r.date_reconciled IS NULL
                    AND iat.gl_account_reconciliation_id IS NULL
                GROUP BY r.id, r.balance_open;
        `);

        await queryRunner.query(
            `ALTER TABLE "gl_account_reconciliation" DROP COLUMN "unreconciled_amount"`
        );

        await queryRunner.query(
            `ALTER TABLE "gl_account_reconciliation" DROP COLUMN "unreconciled_count"`
        );

        await queryRunner.query(`ALTER TABLE "gl_account_reconciliation" DROP COLUMN "change"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            DROP VIEW gl_account_reconciliation_view;
        `);

        await queryRunner.query(
            'ALTER TABLE "gl_account_reconciliation" ADD COLUMN "unreconciled_count" integer NOT NULL DEFAULT 0'
        );

        await queryRunner.query(
            'ALTER TABLE "gl_account_reconciliation" ADD COLUMN "unreconciled_amount" float NOT NULL DEFAULT 0'
        );

        await queryRunner.query(
            'ALTER TABLE "gl_account_reconciliation" ADD COLUMN "change" float NOT NULL DEFAULT 0'
        );
    }
}
