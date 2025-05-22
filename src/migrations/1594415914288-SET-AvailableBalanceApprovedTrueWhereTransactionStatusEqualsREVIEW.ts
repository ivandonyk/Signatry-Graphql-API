import { MigrationInterface, QueryRunner } from 'typeorm';

export class SETAvailableBalanceApprovedTrueWhereTransactionStatusEqualsREVIEW1594415914288
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const [{ id: transaction_status_id }] = await queryRunner.query(/* sql */ `
        SELECT id FROM transaction_status WHERE name = 'REVIEW';
    `);
        await queryRunner.query(/* sql */ `
        UPDATE "fund_transaction" SET available_balance_approved = true WHERE fund_transaction.transaction_status_id = '${transaction_status_id}'
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const [{ id: transaction_status_id }] = await queryRunner.query(/* sql */ `
        SELECT id FROM transaction_status WHERE name = 'REVIEW';
    `);
        await queryRunner.query(/* sql */ `
        UPDATE "fund_transaction" SET available_balance_approved = false WHERE fund_transaction.transaction_status_id = '${transaction_status_id}'
    `);
    }
}
