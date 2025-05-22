import { MigrationInterface, QueryRunner } from 'typeorm';

export class TRUpdateAmountTriggers1594951459736 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
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
                    'NEW',
                    'DUE_DILIGENCE_AND_VETTING',
                    'REVIEW',
                    'READY_FOR_PAYMENT'
                );
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
                AND (
                    transaction_status.name = 'READY_FOR_INVESTMENT'
                    OR (
                        transaction_status.name = 'READY_FOR_PAYMENT'
                        AND fund_transaction.divestment_status = 'DIVESTED'
                    )
                );
                RETURN COALESCE(amount, 0);
            END;
            $$
            LANGUAGE plpgsql;
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

                -- if status name is 'INVESTED' or 'DIVESTED', fund_investment.units should be updated
                -- in the case of contributions, this moves money from cash_balance -> invested_balance
                -- in the case of grants, this moves money from invested_balance -> cash_balance
                IF status_name IN('INVESTED', 'DIVESTED') THEN
                    UPDATE fund_investment
                    SET units = COALESCE(units, 0) + COALESCE(NEW.units, 0)
                    WHERE id = NEW.fund_investment_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
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
                        IF NEW.divestment_status = OLD.divestment_status THEN
                            return NEW;
                        END IF;
                    END IF;
                END IF;

                -- get fund_transaction status name
                SELECT name
                INTO status_name
                FROM transaction_status
                WHERE id = NEW.transaction_status_id;

                -- update invested_balance and cash_balance after relevant status changes            
                IF status_name IN('READY_FOR_INVESTMENT', 'INVESTED', 'READY_FOR_PAYMENT', 'PAYMENT_SENT', 'PROCESSED') THEN
                    UPDATE fund SET
                        invested_balance = get_fund_invested_balance(NEW.fund_id),
                        cash_balance = get_fund_cash_balance(NEW.fund_id)
                    WHERE id = NEW.fund_id;
                END IF;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
    }
}
