import { MigrationInterface, QueryRunner } from 'typeorm';

export class CREATEVIEWVwDetailedHolding1621953577445 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE OR REPLACE VIEW "vw_detailed_holding" AS
                -- IMA DETAIL HOLDINGS
                SELECT i.name AS investment_name,
                    i.close_price,
                    i.close_price_as_of,
                    i.ticker_symbol AS investment_ticker_symbol,
                    i.total_units,
                    i.investment_type,
                    ia.market_value AS investment_account_market_value,
                    ia.account_number,
                    ia.account_type,
                    ia.custodian_name,
                    h.name AS holding_name,
                    h.units,
                    h.market_value AS holding_market_value,
                    h.unit_price,
                    h.asset_class,
                    h.asset_subclass,
                    h.cost_basis,
                    h.cumulative_average_cost,
                    h.cumulative_unrealized,
                    h.cumulative_realized,
                    s.name AS security_name,
                    s.ticker_symbol AS security_ticker_symbol,
                    s.cusip,
                    s.security_type,
                    f.name AS fund_name,
                    f.description AS fund_description,
                    f.fund_code,
                    f.fund_key,
                    f.cash_balance
                FROM investment i
                    JOIN institution_account ia ON i.institution_account_id = ia.id
                    JOIN holding h ON ia.id = h.institution_account_id
                    JOIN security s ON h.security_id = s.id
                    JOIN fund_investment fi ON i.id = fi.investment_id
                    JOIN fund f ON fi.fund_id = f.id
                WHERE i.investment_type = 'IMA'

                UNION

                -- POOL HOLDINGS
                SELECT i.name AS investment_name,
                    i.close_price,
                    i.close_price_as_of,
                    i.ticker_symbol AS investment_ticker_symbol,
                    i.total_units,
                    i.investment_type,
                    ia.market_value AS investment_account_market_value,
                    ia.account_number,
                    ia.account_type,
                    ia.custodian_name,
                    NULL AS "holding_name",
                    pih.units,
                    pih.market_value AS "holding_market_value",
                    pih.unit_price,
                    NULL AS "asset_class",
                    NULL AS "asset_subclass",
                    pih.cost_basis,
                    pih.cumulative_average_cost,
                    pih.cumulative_unrealized,
                    pih.cumulative_realized,
                    NULL AS "security_name",
                    NULL AS "security_ticker_symbol",
                    NULL AS "cusip",
                    NULL AS "security_type",
                    f.name AS fund_name,
                    f.description AS fund_description,
                    f.fund_code,
                    f.fund_key,
                    f.cash_balance
                FROM investment i
                    JOIN institution_account ia ON i.institution_account_id = ia.id
                    JOIN fund_investment fi ON i.id = fi.investment_id
                    JOIN pool_investment_holding pih ON fi.id = pih.fund_investment_id
                    JOIN fund f ON fi.fund_id = f.id
                WHERE i.investment_type = 'POOL'

                UNION

                -- SHARED STOCK
                SELECT i.name AS investment_name,
                    i.close_price,
                    i.close_price_as_of,
                    i.ticker_symbol AS investment_ticker_symbol,
                    i.total_units,
                    i.investment_type,
                    ia.market_value AS investment_account_market_value,
                    ia.account_number,
                    ia.account_type,
                    ia.custodian_name,
                    NULL AS "holding_name",
                    pih.units,
                    pih.market_value AS "holding_market_value",
                    pih.unit_price,
                    NULL AS "asset_class",
                    NULL AS "asset_subclass",
                    pih.cost_basis,
                    pih.cumulative_average_cost,
                    pih.cumulative_unrealized,
                    pih.cumulative_realized,
                    s.name AS security_name,
                    s.ticker_symbol AS security_ticker_symbol,
                    s.cusip,
                    s.security_type,
                    f.name AS fund_name,
                    f.description AS fund_description,
                    f.fund_code,
                    f.fund_key,
                    f.cash_balance
                FROM investment i
                    JOIN institution_account ia ON i.institution_account_id = ia.id
                    JOIN fund_investment fi ON i.id = fi.investment_id
                    JOIN pool_investment_holding pih ON fi.id = pih.fund_investment_id
                    JOIN "security" AS s ON pih.security_id = s.id
                    JOIN fund f ON fi.fund_id = f.id
                WHERE i.investment_type = 'SHARED_STOCK'

                UNION

                -- CASH ACCOUNTS
                SELECT i.name AS investment_name,
                    i.close_price,
                    i.close_price_as_of,
                    i.ticker_symbol AS investment_ticker_symbol,
                    i.total_units,
                    i.investment_type,
                    ia.market_value AS investment_account_market_value,
                    ia.account_number,
                    ia.account_type,
                    ia.custodian_name,
                    h.name AS holding_name,
                    h.units,
                    h.market_value AS holding_market_value,
                    h.unit_price,
                    h.asset_class,
                    h.asset_subclass,
                    h.cost_basis,
                    h.cumulative_average_cost,
                    h.cumulative_unrealized,
                    h.cumulative_realized,
                    s.name AS security_name,
                    s.ticker_symbol AS security_ticker_symbol,
                    s.cusip,
                    s.security_type,
                    f.name AS fund_name,
                    f.description AS fund_description,
                    f.fund_code,
                    f.fund_key,
                    f.cash_balance
                FROM investment i
                    JOIN institution_account ia ON i.institution_account_id = ia.id
                    JOIN holding h ON ia.id = h.institution_account_id
                    JOIN security s ON h.security_id = s.id
                    JOIN fund_investment fi ON i.id = fi.investment_id
                    JOIN fund f ON fi.fund_id = f.id
                WHERE i.investment_type IN ('GRANT_CASH', 'CONTRIBUTION_CASH')`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP VIEW IF EXISTS vw_detailed_holding
        `);
    }
}
