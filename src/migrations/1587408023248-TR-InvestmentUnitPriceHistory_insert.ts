import { MigrationInterface, QueryRunner } from 'typeorm';

export class TRInvestmentUnitPriceHistoryInsert1587408023248 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        /**
         * Update fund.amount_available when a new record
         * is inserted in investment_unit_price_history
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION investment_unit_price_history_insert() RETURNS trigger AS $$
            BEGIN
                UPDATE fund SET
                    amount_available = fund_amount.amount_available,
                    amount_pending = fund_amount.amount_available + COALESCE(fund_amount.amount_outstanding, 0)
                FROM (
                    SELECT
                        id,
                        get_fund_amount_available(id) AS amount_available,
                        get_fund_amount_outstanding(id) AS amount_outstanding
                    FROM fund
                ) fund_amount
                WHERE fund.id = fund_amount.id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        `);

        /**
         * Trigger investment_unit_price_history_insert
         */
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_investment_unit_price_history_insert
            AFTER INSERT ON investment_unit_price_history
            FOR EACH ROW EXECUTE PROCEDURE investment_unit_price_history_insert();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS TR_investment_unit_price_history_insert ON investment_unit_price_history;
        `);
        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS investment_unit_price_history_insert;
        `);
    }
}
