import { MigrationInterface, QueryRunner } from 'typeorm';

export class TRUpdateAmountTriggers1589987852075 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        /**
         * Clean out old functions/triggers
         */

        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS  TR_fund_transaction_detail_update ON fund_transaction_detail
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS fund_transaction_detail_update
        `);

        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS  TR_fund_transaction_detail_insert ON fund_transaction_detail
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS fund_transaction_detail_insert
        `);

        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS  TR_fund_investment_update ON fund_investment
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS fund_investment_update
        `);

        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS  TR_investment_unit_price_history_insert ON investment_unit_price_history
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS investment_unit_price_history_insert
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS get_fund_amount_available(UUID)
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS get_fund_amount_outstanding(UUID)
        `);

        /**
         * Remove old amount columns
         */

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund DROP COLUMN available_balance
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund DROP COLUMN current_balance
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund DROP COLUMN pending_balance
        `);

        /**
         * Add new amount columns
         */

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund ADD COLUMN invested_balance FLOAT NOT NULL DEFAULT 0
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund ADD COLUMN cash_balance FLOAT NOT NULL DEFAULT 0
        `);

        /**
         * Utility function - get fund invested balance
         */

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_invested_balance(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(fund_investment.units * latest_close_price.close_price) as amount
                INTO amount
                FROM fund_investment
                LEFT JOIN (SELECT * FROM get_latest_close_prices()) latest_close_price
                ON fund_investment.investment_id = latest_close_price.investment_id
                WHERE fund_investment.fund_id = $1;
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        /**
         * Utility function - get fund cash balance
         */

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_cash_balance(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ABS(fund_transaction.amount))
                INTO amount
                FROM fund_transaction
                LEFT JOIN transaction_status
                    ON fund_transaction.transaction_status_id = transaction_status.id
                WHERE fund_transaction.fund_id = $1
                AND transaction_status.name IN (
                    'READY_FOR_INVESTMENT',
                    'READY_FOR_PAYMENT'
                );
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        /**
         * Utility function - get fund amount pending incoming
         */

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_incoming(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(fund_transaction.amount)
                INTO amount
                FROM fund_transaction
                LEFT JOIN transaction_status
                    ON fund_transaction.transaction_status_id = transaction_status.id
                WHERE fund_transaction.fund_id = $1
                AND transaction_status.name IN (
                    'PENDING',
                    'READY_FOR_PAYOUT',
                    'PENDING_PAYOUT',
                    'PENDING_BANK_RECONCILIATION'
                );
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        /**
         * Utility function - get fund amount pending outgoing
         */

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_outgoing(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(fund_transaction.amount)
                INTO amount
                FROM fund_transaction
                LEFT JOIN transaction_status
                    ON fund_transaction.transaction_status_id = transaction_status.id
                WHERE fund_transaction.fund_id = $1
                AND transaction_status.name IN (
                    'SPECIAL_APPROVAL',
                    'DUE_DILIGENCE_AND_VETTING',
                    'FINANCIAL_REVIEW',
                    'READY_FOR_DIVESTMENT',
                    'READY_FOR_PAYMENT'
                );
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        /**
         * investment_unit_price_history insert trigger
         */

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION investment_unit_price_history_insert() RETURNS trigger AS $$
            BEGIN
                UPDATE fund SET
                    invested_balance = fund_balance.invested_balance
                FROM (
                    SELECT
                        id,
                        get_fund_invested_balance(id) AS invested_balance
                    FROM fund
                ) fund_balance
                WHERE fund.id = fund_balance.id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_investment_unit_price_history_insert
            AFTER INSERT ON investment_unit_price_history
            FOR EACH ROW EXECUTE PROCEDURE investment_unit_price_history_insert();
        `);

        /**
         * fund_transaction insert/update trigger
         */

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION fund_transaction_update() RETURNS trigger AS $$
            DECLARE
                status_name text;
            BEGIN
                -- ignore update ops that don't include a status change
                IF tg_op = 'UPDATE' THEN
                    IF NEW.transaction_status_id = OLD.transaction_status_id THEN
                        return NEW;
                    END IF;
                END IF;

                -- get fund_transaction status name
                SELECT name
                INTO status_name
                FROM transaction_status
                WHERE id = NEW.transaction_status_id;

                -- update invested_balance and cash_balance after relevant status changes            
                IF status_name IN('READY_FOR_INVESTMENT', 'INVESTED', 'READY_FOR_PAYMENT', 'PAYMENT_SENT') THEN
                    UPDATE fund SET
                        invested_balance = get_fund_invested_balance(NEW.fund_id),
                        cash_balance = get_fund_cash_balance(NEW.fund_id)
                    WHERE id = NEW.fund_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_transaction_update
            AFTER INSERT OR UPDATE ON fund_transaction
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_update();
        `);

        /**
         * fund_transaction_detail insert/update trigger
         */

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION fund_transaction_detail_update() RETURNS trigger AS $$
            DECLARE
                status_name text;
            BEGIN
                -- ignore update ops that don't include a status change
                IF tg_op = 'UPDATE' THEN
                    IF NEW.transaction_detail_status_id = OLD.transaction_detail_status_id THEN
                        return NEW;
                    END IF;
                END IF;

                -- get fund_transaction_detail status name
                SELECT name
                INTO status_name
                FROM transaction_detail_status
                WHERE id = NEW.transaction_detail_status_id;

                -- if status name is 'INVESTED' or 'READY_FOR_PAYMENT', fund_investment.units should be updated
                -- in the case of contributions, this moves money from cash_balance -> invested_balance
                -- in the case of grants, this moves money from invested_balance -> cash_balance
                IF status_name IN('INVESTED', 'READY_FOR_PAYMENT') THEN
                    UPDATE fund_investment
                    SET units = COALESCE(units, 0) + COALESCE(NEW.units, 0)
                    WHERE id = NEW.fund_investment_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_transaction_detail_update
            AFTER INSERT OR UPDATE ON fund_transaction_detail
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_detail_update();
        `);

        // populate the values
        await queryRunner.query(/*sql*/ `
            UPDATE fund SET
                invested_balance = fund_amount.invested_balance,
                cash_balance = fund_amount.cash_balance
            FROM (
                SELECT
                    id,
                    get_fund_invested_balance(id) AS invested_balance,
                    get_fund_cash_balance(id) AS cash_balance
                FROM fund
            ) fund_amount
            WHERE fund.id = fund_amount.id;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        // drop new triggers
        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS TR_fund_transaction_detail_update ON fund_transaction_detail
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS fund_transaction_detail_update
        `);

        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS TR_fund_transaction_update ON fund_transaction
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS fund_transaction_update
        `);

        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS TR_investment_unit_price_history_insert ON investment_unit_price_history
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS investment_unit_price_history_insert
        `);

        await queryRunner.query(/*sql*/ `
            DROP TRIGGER IF EXISTS TR_fund_investment_update ON fund_investment
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS fund_investment_update
        `);

        // drop new utility functions
        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS get_fund_amount_pending_outgoing(UUID)
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS get_fund_amount_pending_incoming(UUID)
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS get_fund_invested_balance(UUID)
        `);

        await queryRunner.query(/*sql*/ `
            DROP FUNCTION IF EXISTS get_fund_cash_balance(UUID)
        `);

        // revert amount columns
        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund DROP COLUMN invested_balance
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund DROP COLUMN cash_balance
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund ADD COLUMN available_balance FLOAT NOT NULL DEFAULT 0
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund ADD COLUMN current_balance FLOAT NOT NULL DEFAULT 0
        `);

        await queryRunner.query(/*sql*/ `
            ALTER TABLE fund ADD COLUMN pending_balance FLOAT NOT NULL DEFAULT 0
        `);

        // revert get_fund_amount_outstanding function
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

        // revert get_fund_amount_available function
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_available(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount_available NUMERIC;
            BEGIN
                SELECT SUM(fund_investment.units * latest_close_price.close_price) as amount_available
                INTO amount_available
                FROM fund_investment
                LEFT JOIN (SELECT * FROM get_latest_close_prices()) latest_close_price
                ON fund_investment.investment_id = latest_close_price.investment_id
                WHERE fund_investment.fund_id = $1;
                RETURN amount_available;
            END;
            $$
            LANGUAGE plpgsql;
        `);

        // revert investment_unit_price_history_insert function
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

        // revert investment_unit_price_history_insert trigger
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_investment_unit_price_history_insert
            AFTER INSERT ON investment_unit_price_history
            FOR EACH ROW EXECUTE PROCEDURE investment_unit_price_history_insert();
        `);

        // revert fund_investment_update function
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

        // revert fund_investment_update trigger
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_investment_update
            AFTER UPDATE ON fund_investment
            FOR EACH ROW EXECUTE PROCEDURE fund_investment_update();
        `);

        // revert fund_transaction_detail_insert function
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

        // revert fund_transaction_detail_insert trigger
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_transaction_detail_insert
            AFTER INSERT ON fund_transaction_detail
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_detail_insert();
        `);

        // revert fund_transaction_detail_update function
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION fund_transaction_detail_update() RETURNS trigger AS $$
                DECLARE
                    status_name text;
                BEGIN
                    -- ignore updates that don't include a status change
                    IF NEW.transaction_detail_status_id = OLD.transaction_detail_status_id THEN
                        return NEW;
                    END IF;
                    
                    -- get fund_transaction_detail status name
                    SELECT name
                    INTO status_name
                    FROM transaction_detail_status
                    WHERE id = NEW.transaction_detail_status_id;
                    
                    -- if status name is 'INVESTED' or 'PAYMENT_IN_PROCESS',
                    -- add the units to the fund_investment.units total
                    IF status_name IN('INVESTED', 'PAYMENT_IN_PROCESS') THEN
                        UPDATE fund_investment
                        SET units = units + COALESCE(NEW.units, 0)
                        WHERE id = NEW.fund_investment_id;
                    END IF;

                    RETURN NEW;
                END
            $$ LANGUAGE plpgsql;
        `);

        // revert fund_transaction_detail_update trigger
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_transaction_detail_update
            AFTER UPDATE ON fund_transaction_detail
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_detail_update();
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
}
