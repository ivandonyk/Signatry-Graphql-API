import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFundBalanceFunctions1607554724440 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update calculation of cash balance to use transaction detail amount 
        // instead of transaction amount
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
        await queryRunner.query(/*sql*/ `
            DROP TRIGGER TR_pool_investment_holding_update ON pool_investment_holding
        `);

        await queryRunner.query(`DROP FUNCTION pool_investment_holding_update`);

        await queryRunner.query(`DROP TRIGGER TR_fund_investment_update ON fund_investment`);

        await queryRunner.query(`DROP FUNCTION fund_investment_update`);
    }

}
