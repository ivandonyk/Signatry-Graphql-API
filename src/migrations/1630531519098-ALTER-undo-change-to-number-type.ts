import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERUndoChangeToNumberType1630531519098 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP VIEW IF EXISTS vw_detailed_holding');
        await queryRunner.query('DROP VIEW IF EXISTS vw_grant_divestment');
        await queryRunner.query('DROP VIEW IF EXISTS vw_all_transaction');
        await queryRunner.query('DROP VIEW IF EXISTS gl_account_reconciliation_view');

        await queryRunner.query('ALTER TABLE holding ALTER COLUMN units TYPE double precision');
        await queryRunner.query('ALTER TABLE holding ALTER COLUMN market_value TYPE double precision');
        await queryRunner.query('ALTER TABLE holding ALTER COLUMN cost_basis TYPE double precision');
        await queryRunner.query('ALTER TABLE holding ALTER COLUMN cumulative_average_cost TYPE double precision');
        await queryRunner.query('ALTER TABLE holding ALTER COLUMN cumulative_realized TYPE double precision');
        await queryRunner.query('ALTER TABLE holding ALTER COLUMN cumulative_unrealized TYPE double precision');

        await queryRunner.query('ALTER TABLE pool_investment_holding ALTER COLUMN units TYPE double precision');
        await queryRunner.query('ALTER TABLE pool_investment_holding ALTER COLUMN market_value TYPE double precision');
        await queryRunner.query('ALTER TABLE pool_investment_holding ALTER COLUMN cost_basis TYPE double precision');
        await queryRunner.query('ALTER TABLE pool_investment_holding ALTER COLUMN cumulative_average_cost TYPE double precision');
        await queryRunner.query('ALTER TABLE pool_investment_holding ALTER COLUMN cumulative_realized TYPE double precision');
        await queryRunner.query('ALTER TABLE pool_investment_holding ALTER COLUMN cumulative_unrealized TYPE double precision');

        await queryRunner.query('ALTER TABLE fund_transaction ALTER COLUMN amount TYPE double precision');
        await queryRunner.query('ALTER TABLE fund_transaction_detail ALTER COLUMN amount TYPE double precision');

        await queryRunner.query('ALTER TABLE institution_account_transaction ALTER COLUMN amount TYPE double precision');
        await queryRunner.query('ALTER TABLE institution_account_transaction ALTER COLUMN fee_amount TYPE double precision');
        await queryRunner.query('ALTER TABLE institution_account_transaction ALTER COLUMN flow_amount TYPE double precision');
        await queryRunner.query('ALTER TABLE institution_account_transaction ALTER COLUMN unit_price TYPE double precision');
        await queryRunner.query('ALTER TABLE institution_account_transaction ALTER COLUMN units TYPE double precision');
        await queryRunner.query('ALTER TABLE institution_account_transaction ALTER COLUMN cost_basis TYPE double precision');
        await queryRunner.query('ALTER TABLE institution_account_transaction ALTER COLUMN realized_gain TYPE double precision');

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


        await queryRunner.query(
            `CREATE OR REPLACE VIEW "vw_grant_divestment" AS
            SELECT ft.transaction_code AS grant_id,
                ft.amount AS grant_amount,
                ts.name AS grant_status,
                f.fund_key,
                f.name,
                ftd.transaction_code AS divestment_id,
                ftd.amount AS divestment_amount,
                tds.name AS divestment_status,
                b.batch_code AS batch_id,
                b.description AS batch_description,
                b.amount AS batch_amount,
                date(b.posted_on) AS batch_posted_on,
                date(b.cleared_on) AS batch_cleared_on,
                b.status AS batch_status,
                glsource.account_number AS batch_source_account_num,
                glsource.title AS batch_source_name,
                (b.source_info ->> 'postedOn'::text)::date AS batch_source_posted_on,
                gldestination.account_number AS batch_destination_account_num,
                gldestination.title AS batch_destination_name,
                (b.destination_info ->> 'postedOn'::text)::date AS batch_destination_posted_on
               FROM fund_transaction_detail ftd
                 JOIN fund_transaction ft ON ftd.fund_transaction_id = ft.id
                 JOIN transaction_status ts ON ft.transaction_status_id = ts.id
                 LEFT JOIN fund f ON ft.fund_id = f.id
                 JOIN transaction_detail_status tds ON ftd.transaction_detail_status_id = tds.id
                 LEFT JOIN batch b ON ftd.batch_id = b.id
                 LEFT JOIN gl_account glsource ON b.source_glaccount_id = glsource.id
                 LEFT JOIN gl_account gldestination ON b.destination_glaccount_id = gldestination.id
              WHERE ftd.destination_glaccount_id = '51e56bb9-16ec-43b8-8144-04f1fc514a26'::uuid AND ftd.transaction_code::text ~~ 'D-%'::text
              ORDER BY ftd.created_on; 
                    `
        );

        await queryRunner.query(`
        CREATE VIEW vw_all_transaction AS
        SELECT
            id,
            fund_transaction_id,
            transaction_date_time,
            transaction_code,
            amount,
            transaction_type,
            fund_id,
            fund_name,
            fund_code,
            fund_key,
            'N/A' AS "source_account_title",
            NULL AS "source_account_number",
            NULL AS "source_account_id",
            'N/A' AS "destination_account_title",
            NULL AS "destination_account_number",
            NULL AS "destination_account_id",
            transaction_status,
            status_desc,
            CASE WHEN transaction_type = 'GRANT'
                OR transaction_type = 'GRANT_SERIES'
                OR transaction_type = 'GRANT_DIVESTMENT_CASH' THEN
                CASE WHEN transaction_status = 'SUBMITTED'
                    OR transaction_status = 'IN_DUE_DILIGENCE'
                    OR transaction_status = 'NEW'
                    OR transaction_status = 'IN_REVIEW'
                    OR transaction_status = 'APPROVED'
                    OR transaction_status = 'SCHEDULED'
                    OR transaction_status = 'PAID'
                    OR transaction_status = 'PENDING_RECONCILIATION'
                    OR transaction_status = 'READY_FOR_DIVESTMENT' THEN
                    'PENDING'
                ELSE
                    transaction_status
                END
            WHEN transaction_type = 'CONTRIBUTION'
                OR transaction_type = 'CONTRIBUTION_SERIES' THEN
                CASE WHEN transaction_status = 'NEW'
                    OR transaction_status = 'PENDING'
                    OR transaction_status = 'PENDING_RECONCILIATION' THEN
                    'PENDING'
                ELSE
                    transaction_status
                END
            WHEN transaction_type = 'TRANSFER_IN'
                OR transaction_type = 'TRANSFER_OUT'
                OR transaction_type = 'REBALANCE' THEN
                CASE WHEN transaction_status = 'PENDING'
                    OR transaction_status = 'PENDING_RECONCILIATION' THEN
                    'PENDING'
                ELSE
                    transaction_status
                END
            WHEN transaction_type = 'INVESTMENT'
                OR transaction_type = 'DIVESTMENT'
                OR transaction_type = 'TRANSFER' THEN
                CASE WHEN transaction_status = 'PENDING'
                    OR transaction_status = 'READY_FOR_DIVESTMENT'
                    OR transaction_status = 'READY_FOR_INVESTMENT'
                    OR transaction_status = 'PENDING_RECONCILIATION' THEN
                    'PENDING'
                ELSE
                    transaction_status
                END
            WHEN transaction_type = 'FEE'
                OR transaction_type = 'INVESTMENT_FEE'
                OR transaction_type = 'BANK_FEE'
                OR transaction_type = 'PROCESSING_FEE'
                OR transaction_type = 'ADVISOR_FEE'
                OR transaction_type = 'ADMINISTRATION_FEE' THEN
                CASE WHEN transaction_status = 'PENDING'
                    OR transaction_status = 'SUBMITTED' THEN
                    'PENDING'
                ELSE
                    transaction_status
                END
            WHEN transaction_type = 'INTEREST'
                OR transaction_type = 'DIVIDEND'
                OR transaction_type = 'INCOME' THEN
                CASE WHEN transaction_status = 'PENDING' THEN
                    'PENDING'
                ELSE
                    transaction_status
                END
            WHEN transaction_type = 'BUY'
                OR transaction_type = 'SELL' THEN
                CASE WHEN transaction_status = 'PENDING' THEN
                    'PENDING'
                ELSE
                    transaction_status
                END
            END AS "accounting_status"
        FROM (
            SELECT
                ft.id AS "id",
                ft.id AS "fund_transaction_id",
                ft.transaction_date_time,
                ft.transaction_code,
                ft.amount,
                tt.name AS "transaction_type",
                f.id AS "fund_id",
                f.name AS "fund_name",
                f.fund_code,
                f.fund_key,
                ts.name AS "transaction_status",
                ts.description AS "status_desc"
            FROM
                fund_transaction AS "ft"
                INNER JOIN transaction_type AS "tt" ON ft.transaction_type_id = tt.id
                INNER JOIN fund AS "f" ON ft.fund_id = f.id
                INNER JOIN transaction_status AS "ts" ON ft.transaction_status_id = ts.id
            WHERE
                tt.name NOT IN ('CONTRIBUTION_SERIES', 'GRANT_SERIES')
            UNION ALL
            SELECT
                ftd.id AS "id",
                ftd.fund_transaction_id AS "fund_transaction_id",
                ftd.transaction_date_time,
                ftd.transaction_code,
                ftd.amount,
                tdt.name AS "transaction_type",
                f.id AS "fund_id",
                f.name AS "fund_name",
                f.fund_code,
                f.fund_key,
                tds.name AS "transaction_status",
                tds.description AS "status_desc"
            FROM
                fund_transaction_detail AS "ftd"
                INNER JOIN transaction_detail_type AS "tdt" ON ftd.transaction_detail_type_id = tdt.id
                INNER JOIN fund_transaction AS "ft" ON ftd.fund_transaction_id = ft.id
                INNER JOIN fund AS "f" ON ft.fund_id = f.id
                INNER JOIN transaction_detail_status AS "tds" ON ftd.transaction_detail_status_id = tds.id
            WHERE
                tdt.name IN ('INVESTMENT', 'DIVESTMENT', 'TRANSFER')) AS "all_trans";
        `);

        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE VIEW gl_account_reconciliation_view AS
                SELECT r.id,
                    COUNT(iat.id) as unreconciled_count,
                    coalesce(SUM(iat.amount), 0) as unreconciled_amount,
                    (coalesce(SUM(iat.amount), 0) * 100) / (CASE WHEN r.balance_open = 0 THEN 1 ELSE r.balance_open END) as change
                FROM gl_account_reconciliation r
                LEFT JOIN institution_account ia 
                    ON ia.gl_account_id = r.gl_account_id
                LEFT JOIN tenant_account ta 
                    ON ta.gl_account_id = r.gl_account_id
                LEFT JOIN institution_account_transaction iat 
                    ON (iat.institution_account_id = ia.id)
                    OR (iat.tenant_account_id = ta.id)
                WHERE 
                    r.date_reconciled IS NULL
                    AND iat.gl_account_reconciliation_id IS NULL
                GROUP BY r.id, r.balance_open;
        `);

        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_gl_account_reconciliation_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                gl_account_name TEXT;
                institution_account_custodian TEXT;
                institution_account_name TEXT;
                institution_account_number TEXT;
                tenant_account_name TEXT;
                tenant_account_number TEXT;
            BEGIN
                -- get gl_account values
                SELECT
                    a.title,
                    ia.custodian_name,
                    ia.account_number,
                    ia.display_name,
                    ta.name,
                    ta.mask
                INTO
                    gl_account_name,
                    institution_account_custodian,
                    institution_account_number,
                    institution_account_name,
                    tenant_account_name,
                    tenant_account_number
                FROM gl_account_reconciliation r 
                INNER JOIN gl_account a ON r.gl_account_id = a.id
                LEFT JOIN institution_account ia ON ia.gl_account_id = a.id
                LEFT JOIN tenant_account ta ON ta.gl_account_id = a.id
                WHERE r.id = target_id;

                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    COALESCE(institution_account_name, '') || ' ' ||
                    COALESCE(tenant_account_name, '') || ' ' ||
                    COALESCE(tenant_account_number, '') || ' ' ||
                    COALESCE(gl_account_name, '') || ' ' ||
                    COALESCE(institution_account_custodian, '') || ' ' ||
                    COALESCE(institution_account_number, '')
                );
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION gl_account_reconciliation_on_tenant_account_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE gl_account_reconciliation
                SET search_vector = get_gl_account_reconciliation_tsvector(id)
                WHERE gl_account_id IN (SELECT ta.gl_account_id FROM tenant_account ta WHERE ta.id = NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
