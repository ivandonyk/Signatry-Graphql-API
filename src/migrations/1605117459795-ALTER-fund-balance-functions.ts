import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundBalanceFunctions1605117459795 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        /**
         * Utility function - get fund invested balance
         */

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_invested_balance(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                pool_amount NUMERIC;
                ima_amount NUMERIC;
            BEGIN
                SELECT SUM(fund_investment.units * latest_close_price.close_price) as amount
                    INTO pool_amount
                    FROM fund_investment
                    JOIN investment
                        ON fund_investment.investment_id = investment.id
                    LEFT JOIN (SELECT * FROM get_latest_close_prices()) latest_close_price
                        ON fund_investment.investment_id = latest_close_price.investment_id
                    WHERE fund_investment.fund_id = $1
                    AND investment.investment_type = 'POOL';

                SELECT market_value
                    INTO ima_amount
                    FROM investment
                    JOIN fund_investment
                        ON investment.id = fund_investment.investment_id
                    WHERE investment.investment_type = 'IMA'
                    AND fund_investment.fund_id = $1;

                RETURN COALESCE(pool_amount, 0) + COALESCE(ima_amount, 0);
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
                SELECT SUM(ABS(ft.amount))
                INTO amount
                FROM fund_transaction ft
                JOIN fund_transaction_detail ftd
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name IN ('GRANT_CASH', 'CONTRIBUTION_CASH') 
                AND tds.name IN (
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
                SELECT SUM(ft.amount)
                INTO amount
                FROM fund_transaction ft
                JOIN fund_transaction_detail ftd
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name = 'CONTRIBUTION_CASH'
                AND tds.name IN (
                    'PENDING',
                    'READY_FOR_PAYOUT',
                    'PENDING_PAYOUT',
                    'PENDING_RECONCILIATION'
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
                SELECT SUM(ft.amount)
                INTO amount
                FROM fund_transaction ft
                JOIN fund_transaction_detail ftd
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name = 'GRANT_CASH'
                AND tds.name IN (
                    'PENDING',
                    'READY_FOR_PAYMENT',
                    'READY_FOR_DIVESTMENT',
                    'PENDING_RECONCILIATION'
                );

                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
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
                IF status_name IN('READY_FOR_INVESTMENT', 'COMPLETE', 'READY_FOR_PAYMENT', 'PENDING_RECONCILIATION') THEN
                    UPDATE fund SET
                        invested_balance = get_fund_invested_balance(NEW.fund_id),
                        cash_balance = get_fund_cash_balance(NEW.fund_id)
                    WHERE id = NEW.fund_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query('DROP TRIGGER TR_fund_transaction_update ON fund_transaction');

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
                fund_id uuid;
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

                -- if status name is 'COMPLETE' fund_investment.units should be updated
                -- in the case of contributions, this moves money from cash_balance -> invested_balance
                -- in the case of grants, this moves money from invested_balance -> cash_balance
                IF status_name IN('COMPLETE', 'READY_FOR_PAYMENT') THEN
                    UPDATE fund_investment
                    SET units = COALESCE(units, 0) + COALESCE(NEW.units, 0)
                    FROM investment
                    WHERE fund_investment.id = NEW.fund_investment_id
                    AND investment.investment_type = 'POOL';
                END IF;

                -- update invested_balance and cash_balance after relevant status changes            
                SELECT f.id
                INTO fund_id
                FROM fund f
                JOIN fund_transaction ft
                    ON ft.fund_id = f.id
                WHERE NEW.fund_transaction_id = ft.id
                LIMIT 1;

                IF status_name IN('READY_FOR_INVESTMENT', 'COMPLETE', 'READY_FOR_PAYMENT', 'PENDING_RECONCILIATION') THEN
                    UPDATE fund SET
                        invested_balance = get_fund_invested_balance(fund_id),
                        cash_balance = get_fund_cash_balance(fund_id)
                    WHERE id = fund_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(
            'DROP TRIGGER TR_fund_transaction_detail_update ON fund_transaction_detail'
        );

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

    public async down(queryRunner: QueryRunner): Promise<void> {
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

        await queryRunner.query('DROP TRIGGER TR_fund_transaction_update ON fund_transaction');
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

        await queryRunner.query(
            'DROP TRIGGER TR_fund_transaction_detail_update ON fund_transaction_detail'
        );
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
}
