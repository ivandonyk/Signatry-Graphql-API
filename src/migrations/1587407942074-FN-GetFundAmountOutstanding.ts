import { MigrationInterface, QueryRunner } from 'typeorm';

export class FNGetFundAmountOutstanding1587407942074 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        /**
         * Return dollar amount of all transactions for fund that are in a 'pending' status
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_outstanding(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount_pending NUMERIC;
            BEGIN
                SELECT SUM(fund_transaction_detail.amount)
                INTO amount_pending
                FROM fund_transaction_detail
                LEFT JOIN transaction_detail_status
                    ON fund_transaction_detail.transaction_detail_status_id = transaction_detail_status.id
                LEFT JOIN fund_transaction
                    ON fund_transaction_detail.fund_transaction_id = fund_transaction.id
                WHERE fund_transaction.fund_id = $1
                AND transaction_detail_status.name IN (
                    'PENDING',
                    'READY_FOR_INVESTMENT',
                    'READY_FOR_DIVESTMENT'
                );
                RETURN amount_pending;
            END;
            $$
            LANGUAGE plpgsql;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS get_fund_amount_outstanding;
        `);
    }
}
