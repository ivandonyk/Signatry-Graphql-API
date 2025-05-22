import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundRenameAmountColumns1588721311720 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // rename amount_available -> available_balance
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund RENAME COLUMN amount_available TO available_balance
        `);

        // rename amount_pending -> current_balance
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund RENAME COLUMN amount_pending TO current_balance
        `);

        // add pending_balance
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund ADD COLUMN pending_balance FLOAT NOT NULL DEFAULT 0
        `);

        /**
         * Update fund.pending_balance and fund.current_balance
         * when a fund_transaction_detail record is inserted
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION fund_transaction_detail_insert() RETURNS trigger AS $$
            BEGIN
                UPDATE fund
                SET
                    pending_balance = fund_amount_outstanding,
                    current_balance = available_balance + fund_amount_outstanding
                FROM (
                    SELECT
                        fund_id,
                        COALESCE(get_fund_amount_outstanding(fund_id), 0) as fund_amount_outstanding
                    FROM fund_transaction
                    WHERE id = NEW.fund_transaction_id
                ) fund_transaction
                WHERE id = fund_transaction.fund_id;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        /**
         * Update fund amounts when a new record
         * is inserted in investment_unit_price_history
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION investment_unit_price_history_insert() RETURNS trigger AS $$
            BEGIN
                UPDATE fund SET
                    available_balance = fund_amount.available_balance,
                    pending_balance = fund_amount.pending_balance,
                    current_balance = fund_amount.available_balance + fund_amount.pending_balance
                FROM (
                    SELECT
                        id,
                        get_fund_amount_available(id) AS available_balance,
                        COALESCE(get_fund_amount_outstanding(id), 0) AS pending_balance
                    FROM fund
                ) fund_amount
                WHERE fund.id = fund_amount.id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        `);

        /**
         * Update fund amounts when fund_investment.units changes
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION fund_investment_update() RETURNS trigger AS $$
            DECLARE
                available float8;
                outstanding float8;
            BEGIN
                -- if units has changed
                IF NEW.units <> OLD.units THEN
                    -- get amount available
                    SELECT * FROM get_fund_amount_available(NEW.fund_id)
                    INTO available;
                    -- get amount oustanding
                    SELECT * FROM COALESCE(get_fund_amount_outstanding(NEW.fund_id), 0)
                    INTO outstanding;
                    -- update fund amounts
                    UPDATE fund SET
                        available_balance = available,
                        pending_balance = outstanding,
                        current_balance = available + outstanding
                    WHERE id = NEW.fund_id;
                END IF;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        `);

        // populate the values
        await queryRunner.query(/*sql*/ `
            UPDATE fund SET
                available_balance = fund_amount.amount_available,
                pending_balance = fund_amount.amount_outstanding,
                current_balance = fund_amount.amount_available + fund_amount.amount_outstanding
            FROM (
                SELECT
                    id,
                    get_fund_amount_available(id) AS amount_available,
                    COALESCE(get_fund_amount_outstanding(id), 0) AS amount_outstanding
                FROM fund
            ) fund_amount
            WHERE fund.id = fund_amount.id;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund RENAME COLUMN current_balance TO amount_pending
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund RENAME COLUMN available_balance TO amount_available
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund DROP COLUMN pending_balance
        `);

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
         * Update fund.amount_available when fund_investment.units changes
         */
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION fund_investment_update() RETURNS trigger AS $$
            DECLARE
                amount float8;
            BEGIN
                -- if units has changed
                IF NEW.units <> OLD.units THEN
                    SELECT * FROM get_fund_amount_available(NEW.fund_id)
                    INTO amount;
                    -- update fund.amount_available and fund.amount_pending
                    UPDATE fund SET
                        amount_available = amount,
                        amount_pending = amount + COALESCE(get_fund_amount_outstanding(NEW.fund_id), 0)
                    WHERE id = NEW.fund_id;
                END IF;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        `);
    }
}
