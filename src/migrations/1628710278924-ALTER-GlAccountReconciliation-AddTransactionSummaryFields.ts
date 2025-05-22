import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERGlAccountReconciliationAddTransactionSummaryFields1628710278924 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN starting_balance NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN ending_balance NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN change_in_investment_value NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN deposits NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN withdrawals NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN fees NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN dividends NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN interest NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN sells NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN sells_units NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN buys NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN buys_units NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN stock_transfers NUMERIC`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation ADD COLUMN stock_transfers_units NUMERIC`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN starting_balance`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN ending_balance`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN change_in_investment_value`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN deposits`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN withdrawals`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN fees`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN dividends`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN interest`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN sells`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN sells_units`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN buys`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN buys_units`);
        await queryRunner.query(`ALTER TABLE gl_account_reconciliation DROP COLUMN stock_transfers_units`);
    }

}
