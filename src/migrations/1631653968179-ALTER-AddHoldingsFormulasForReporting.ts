import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERAddHoldingsFormulasForReporting1631653968179 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_latest_ima_holdings_for_fund(fund_id UUID) RETURNS NUMERIC AS $$
                DECLARE
                    total_amount NUMERIC := 0;
                    institution_account_ids RECORD;
                    single_market_value NUMERIC := 0;
                    market_value_date DATE;
                BEGIN
                FOR institution_account_ids IN
                    SELECT ia.id
                    FROM institution_account ia
                    JOIN investment i
                        ON i.institution_account_id = ia.id
                    JOIN fund_investment fi
                        ON fi.investment_id = i.id
                    WHERE fi.fund_id = $1
                    AND i.investment_type = 'IMA'
                LOOP
                    SELECT
                        COALESCE(SUM(h.market_value),0)::NUMERIC
                    INTO single_market_value
                    FROM holding h
                    JOIN institution_account ia
                        ON h.institution_account_id = ia.id
                    JOIN investment i
                        ON ia.id = i.institution_account_id
                        AND i.investment_type = 'IMA'
                    JOIN fund_investment fi
                    ON i.id = fi.investment_id
                    WHERE h.date::date =
                        (
                            SELECT DATE(ho.date)
                            FROM holding ho
                            WHERE ho.institution_account_id = institution_account_ids.id
                            ORDER BY ho.date DESC
                            LIMIT 1
                        )::date
                    AND fi.fund_id = $1
                    AND h.institution_account_id = institution_account_ids.id;
                    
                    total_amount = total_amount + single_market_value;
                END LOOP;
                RETURN total_amount;
                END
            $$ LANGUAGE plpgsql;
        `);

        queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_latest_pool_holdings_for_fund(fund_id UUID) RETURNS NUMERIC AS $$
                DECLARE
                    total_amount NUMERIC := 0;
                    fund_investment_ids RECORD;
                    single_market_value NUMERIC := 0;
                    market_value_date DATE;
                BEGIN
                FOR fund_investment_ids IN
                    SELECT fi.id
                    FROM fund_investment fi
                    JOIN investment i
                        ON fi.investment_id = i.id
                    WHERE fi.fund_id = $1
                    AND i.investment_type = 'POOL'
                LOOP
                    SELECT
                        COALESCE(SUM(ph.market_value),0)::NUMERIC
                    INTO single_market_value
                    FROM pool_investment_holding ph
                    JOIN fund_investment fi
                        ON ph.fund_investment_id = fi.id
                    WHERE ph.date::date =
                        (
                            SELECT DATE(pih.date)
                            FROM pool_investment_holding pih
                            WHERE pih.fund_investment_id = fund_investment_ids.id
                            ORDER BY pih.date DESC
                            LIMIT 1
                        )::date
                    AND ph.fund_investment_id = fund_investment_ids.id;
              
                    total_amount = total_amount + single_market_value;
                END LOOP;
                RETURN total_amount;
                END
            $$ LANGUAGE plpgsql;
        `);

        queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_latest_cash_holdings_for_fund(fund_id UUID) RETURNS NUMERIC AS $$
                DECLARE
                    total_amount NUMERIC := 0;
                    fund_investment_ids RECORD;
                    single_market_value NUMERIC := 0;
                    market_value_date DATE;
                BEGIN
                FOR fund_investment_ids IN
                    SELECT fi.id
                    FROM fund_investment fi
                    JOIN investment i
                        ON fi.investment_id = i.id
                    WHERE fi.fund_id = $1
                    AND i.investment_type IN ('GRANT_CASH', 'CONTRIBUTION_CASH')
                LOOP
                    SELECT
                        COALESCE(SUM(ph.market_value),0)::NUMERIC
                    INTO single_market_value
                    FROM pool_investment_holding ph
                    JOIN fund_investment fi
                        ON ph.fund_investment_id = fi.id
                    WHERE ph.date =
                        (
                            SELECT pih.date
                            FROM pool_investment_holding pih
                            WHERE pih.fund_investment_id = fund_investment_ids.id
                            ORDER BY pih.date DESC
                            LIMIT 1
                        )
                    AND ph.fund_investment_id = fund_investment_ids.id;
              
                    total_amount = total_amount + single_market_value;
                END LOOP;
                RETURN total_amount;
                END
            $$ LANGUAGE plpgsql;
        `);

        queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_latest_security_holdings_for_fund(fund_id UUID) RETURNS NUMERIC AS $$
                DECLARE
                    total_amount NUMERIC := 0;
                    fund_investment_ids RECORD;
                    single_market_value NUMERIC := 0;
                    market_value_date DATE;
                BEGIN
                FOR fund_investment_ids IN
                    SELECT fi.id
                    FROM fund_investment fi
                    JOIN investment i
                        ON fi.investment_id = i.id
                    WHERE fi.fund_id = $1
                    AND i.investment_type IN ('SHARED_STOCK', 'SHARED_STOCK_HOLD', 'SHARED_STOCK_VANGUARD')
                LOOP
                    SELECT
                        COALESCE(SUM(ph.market_value),0)::NUMERIC
                    INTO single_market_value
                    FROM pool_investment_holding ph
                    JOIN fund_investment fi
                        ON ph.fund_investment_id = fi.id
                    WHERE ph.date::date =
                        (
                            SELECT DATE(pih.date)
                            FROM pool_investment_holding pih
                            WHERE pih.fund_investment_id = fund_investment_ids.id
                            ORDER BY pih.date DESC
                            LIMIT 1
                        )::date
                    AND ph.fund_investment_id = fund_investment_ids.id;
              
                    total_amount = total_amount + single_market_value;
                END LOOP;
                RETURN total_amount;
                END
            $$ LANGUAGE plpgsql;
        `);

        queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_latest_total_holdings_for_fund(fund_id UUID) RETURNS NUMERIC AS $$
                DECLARE
                    total_amount NUMERIC := 0;
                    ima_amount NUMERIC := 0;
                    pool_amount NUMERIC := 0;
                    cash_amount NUMERIC := 0;
                    security_amount NUMERIC := 0;
                BEGIN
                
                    ima_amount = get_latest_ima_holdings_for_fund($1);
                    pool_amount = get_latest_pool_holdings_for_fund($1);
                    cash_amount = get_latest_cash_holdings_for_fund($1);
                    security_amount = get_latest_security_holdings_for_fund($1);

                    total_amount = ima_amount + pool_amount + cash_amount + security_amount;

                    RETURN total_amount;
                END
            $$ LANGUAGE plpgsql;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(/* sql */ `
            DROP FUNCTION get_latest_total_holdings_for_fund
        `);

        queryRunner.query(/* sql */ `
            DROP FUNCTION get_latest_ima_holdings_for_fund
        `);

        queryRunner.query(/* sql */ `
            DROP FUNCTION get_latest_pool_holdings_for_fund
        `);

        queryRunner.query(/* sql */ `
            DROP FUNCTION get_latest_cash_holdings_for_fund
        `);

        queryRunner.query(/* sql */ `
            DROP FUNCTION get_latest_security_holdings_for_fund
        `);
    }
}
