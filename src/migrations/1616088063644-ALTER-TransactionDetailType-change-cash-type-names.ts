import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERTransactionDetailTypeChangeCashTypeNames1616088063644
    implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TYPE "transaction_detail_type_name" RENAME TO "_transaction_detail_type_name"'
        );

        await queryRunner.query(`
        CREATE TYPE "transaction_detail_type_name" AS ENUM (
        'GRANT_DIVESTMENT_CASH',
        'CASH_OUT',
        'CASH_IN',
        'INVESTMENT',
        'DIVESTMENT',
        'FEE',
        'TRANSFER_IN',
        'TRANSFER_OUT'
        )`);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        RENAME COLUMN "name" TO "_name"
        `);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        ADD COLUMN "name" "transaction_detail_type_name"
        `);

        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'CASH_OUT' WHERE "_name" = 'GRANT_PAYMENT_CASH'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'CASH_IN' WHERE "_name" = 'CONTRIBUTION_CASH'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'INVESTMENT' WHERE "_name" = 'INVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'DIVESTMENT' WHERE "_name" = 'DIVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'GRANT_DIVESTMENT_CASH' WHERE "_name" = 'GRANT_DIVESTMENT_CASH'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'FEE' WHERE "_name" = 'FEE'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'TRANSFER_IN' WHERE "_name" = 'TRANSFER_IN'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'TRANSFER_OUT' WHERE "_name" = 'TRANSFER_OUT'
        `);

        await queryRunner.query('ALTER TABLE "transaction_detail_type" DROP COLUMN "_name"');

        await queryRunner.query('DROP TYPE "_transaction_detail_type_name"');

        // Drop balance fields on fund and trigger functions, will use holdings to calculate instead
        await queryRunner.query('DROP TRIGGER TR_fund_transaction_update ON fund_transaction');
        await queryRunner.query(
            'DROP TRIGGER TR_fund_transaction_detail_update ON fund_transaction_detail'
        );
        await queryRunner.query(
            'DROP TRIGGER TR_pool_investment_holding_update ON pool_investment_holding'
        );
        await queryRunner.query('DROP TRIGGER TR_fund_investment_update ON fund_investment');
        await queryRunner.query('DROP FUNCTION fund_transaction_update');
        await queryRunner.query('DROP FUNCTION fund_transaction_detail_update');
        await queryRunner.query('DROP FUNCTION get_fund_cash_balance');
        await queryRunner.query('DROP FUNCTION fund_investment_update');
        await queryRunner.query('DROP FUNCTION get_fund_invested_balance');
        await queryRunner.query('DROP FUNCTION pool_investment_holding_update');

        // Update pending outgoing and incoming functions to use new type
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_outgoing(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ftd.amount)
                INTO amount
                FROM fund_transaction_detail ftd
                JOIN fund_transaction ft
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name = 'CASH_OUT'
                AND tds.name IN (
                    'PENDING',
                    'READY_FOR_PAYMENT',
                    'PENDING_RECONCILIATION'
                );

                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_amount_pending_incoming(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                amount NUMERIC;
            BEGIN
                SELECT SUM(ftd.amount)
                INTO amount
                FROM fund_transaction_detail ftd
                JOIN fund_transaction ft
                    ON ftd.fund_transaction_id = ft.id
                JOIN transaction_detail_type tdt
                    ON ftd.transaction_detail_type_id = tdt.id
                JOIN transaction_detail_status tds
                    ON ftd.transaction_detail_status_id = tds.id
                WHERE ft.fund_id = $1
                AND tdt.name = 'CASH_IN'
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TYPE "transaction_detail_type_name" RENAME TO "_transaction_detail_type_name"'
        );

        await queryRunner.query(`
        CREATE TYPE "transaction_detail_type_name" AS ENUM (
        'GRANT_DIVESTMENT_CASH',
        'GRANT_PAYMENT_CASH',
        'CONTRIBUTION_CASH',
        'INVESTMENT',
        'DIVESTMENT',
        'FEE',
        'TRANSFER_IN',
        'TRANSFER_OUT'
        )`);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        RENAME COLUMN "name" TO "_name"
        `);

        await queryRunner.query(`
        ALTER TABLE "transaction_detail_type" 
        ADD COLUMN "name" "transaction_detail_type_name"
        `);

        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'GRANT_PAYMENT_CASH' WHERE "_name" = 'CASH_OUT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'CONTRIBUTION_CASH' WHERE "_name" = 'CASH_IN'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'INVESTMENT' WHERE "_name" = 'INVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'DIVESTMENT' WHERE "_name" = 'DIVESTMENT'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'GRANT_DIVESTMENT_CASH' WHERE "_name" = 'GRANT_DIVESTMENT_CASH'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'FEE' WHERE "_name" = 'FEE'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'TRANSFER_IN' WHERE "_name" = 'TRANSFER_IN'
        `);
        await queryRunner.query(`
        UPDATE "transaction_detail_type" 
        SET "name" = 'TRANSFER_OUT' WHERE "_name" = 'TRANSFER_OUT'
        `);

        await queryRunner.query('ALTER TABLE "transaction_detail_type" DROP COLUMN "_name"');

        // Update cash balance function to use new type
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
                AND tdt.name IN ('GRANT_PAYMENT_CASH', 'CONTRIBUTION_CASH') 
                AND tds.name IN (
                    'READY_FOR_INVESTMENT',
                    'READY_FOR_PAYMENT'
                );
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        // Update pending outgoing function to use new type
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
                AND tdt.name = 'GRANT_PAYMENT_CASH'
                AND tds.name IN (
                    'PENDING',
                    'READY_FOR_PAYMENT',
                    'PENDING_RECONCILIATION'
                );

                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

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
                AND tdt.name IN ('CASH_OUT', 'CASH_IN') 
                AND tds.name IN (
                    'READY_FOR_INVESTMENT',
                    'READY_FOR_PAYMENT'
                );
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);

        // Drop old type enum
        await queryRunner.query('DROP TYPE "_transaction_detail_type_name"');

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

        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_transaction_update
            AFTER INSERT OR UPDATE ON fund_transaction
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_update();
        `);

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

        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER TR_fund_transaction_detail_update
            AFTER INSERT OR UPDATE ON fund_transaction_detail
            FOR EACH ROW EXECUTE PROCEDURE fund_transaction_detail_update();
        `);

        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION pool_investment_holding_update()
        RETURNS trigger 
        AS $$ 
        DECLARE 
        update_fund_id uuid;
        BEGIN
        SELECT fi.fund_id
        INTO update_fund_id 
        FROM pool_investment_holding pih
        JOIN fund_investment fi
        ON pih.fund_investment_id = fi.id
        WHERE pih.id = NEW.id 
        LIMIT 1;

        UPDATE fund
        SET cash_balance = get_fund_cash_balance(fund.id)
        WHERE fund.id = update_fund_id;

        RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(/*sql*/ `
        CREATE TRIGGER TR_pool_investment_holding_update
        AFTER INSERT OR UPDATE ON pool_investment_holding
        FOR EACH ROW EXECUTE PROCEDURE pool_investment_holding_update()
        `);

        await queryRunner.query(`
        CREATE OR REPLACE FUNCTION fund_investment_update()
        RETURNS trigger 
        AS $$ 
        BEGIN
        UPDATE fund
        SET invested_balance = get_fund_invested_balance(NEW.fund_id)
        WHERE id = NEW.fund_id;

        RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(/*sql*/ `
        CREATE TRIGGER TR_fund_investment_update
        AFTER INSERT OR UPDATE ON fund_investment
        FOR EACH ROW EXECUTE PROCEDURE fund_investment_update()
        `);

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

        SELECT SUM(market_value)
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

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION get_fund_cash_balance(fund_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                contribution_amount NUMERIC;
                grant_amount NUMERIC;
            BEGIN
                SELECT pih.market_value
                INTO contribution_amount
                FROM pool_investment_holding pih
                JOIN fund_investment fi
                    ON pih.fund_investment_id = fi.id
                JOIN investment i
                    ON fi.investment_id = i.id
                WHERE i.investment_type = 'CONTRIBUTION_CASH'
                AND fi.fund_id = get_fund_cash_balance.fund_id
                ORDER BY pih.created_on DESC
                LIMIT 1;

                SELECT pih.market_value
                INTO grant_amount
                FROM pool_investment_holding pih
                JOIN fund_investment fi
                    ON pih.fund_investment_id = fi.id
                JOIN investment i
                    ON fi.investment_id = i.id
                WHERE i.investment_type = 'GRANT_CASH'
                AND fi.fund_id = get_fund_cash_balance.fund_id
                ORDER BY pih.created_on DESC
                LIMIT 1;

                RETURN COALESCE(contribution_amount, 0) + COALESCE(grant_amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
        `);
    }
}
