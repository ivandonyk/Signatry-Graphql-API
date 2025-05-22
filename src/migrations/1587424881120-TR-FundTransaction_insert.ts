import { MigrationInterface, QueryRunner } from 'typeorm';

export class TRFundTransactionInsert1587424881120 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        /**
         * Update fund.amount_pending when a fund_transaction_detail record is inserted
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION fund_transaction_detail_insert() RETURNS trigger AS $$
            BEGIN
                UPDATE fund
                SET amount_pending = amount_available + COALESCE(get_fund_amount_outstanding(id), 0)
                FROM (
                    SELECT fund_id FROM fund_transaction WHERE id = NEW.fund_transaction_id
                ) fund_transaction
                WHERE id = fund_transaction.fund_id;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        /**
         * Trigger fund_transaction_detail_insert
         */
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_transaction_detail_insert
            AFTER INSERT ON fund_transaction_detail
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_detail_insert();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS TR_fund_transaction_insert ON fund_transaction;
        `);
        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS fund_transaction_insert;
        `);
    }
}
