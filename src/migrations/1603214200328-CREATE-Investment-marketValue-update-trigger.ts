import {MigrationInterface, QueryRunner} from "typeorm";

export class CREATEInvestmentMarketValueUpdateTrigger1603214200328 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION get_account_holdings_total(institution_account_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                total_amount NUMERIC;
            BEGIN
                SELECT SUM(h.market_value)
                INTO total_amount
                FROM holding h
                WHERE h.institution_account_id = $1 AND
                h.date > (SELECT CURRENT_DATE);
                RETURN total_amount;
            END;
            $$
            LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION get_pool_units_total(investment_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                total_amount NUMERIC;
            BEGIN
                SELECT SUM(pih.units)
                INTO total_amount
                FROM pool_investment_holding pih
                JOIN fund_investment fi ON fi.id = pih.fund_investment_id
                WHERE fi.investment_id = $1 AND
                pih.date > (SELECT CURRENT_DATE);
                RETURN total_amount;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION get_pool_holdings_total(investment_id UUID) RETURNS NUMERIC AS $$
            DECLARE
                total_amount NUMERIC;
            BEGIN
                SELECT SUM(pih.market_value)
                INTO total_amount
                FROM pool_investment_holding pih
                JOIN fund_investment fi ON fi.id = pih.fund_investment_id
                WHERE fi.investment_id = $1 AND
                pih.date > (SELECT CURRENT_DATE);
                RETURN total_amount;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION investment_market_value_update() RETURNS trigger AS $$
            BEGIN
                UPDATE investment
                SET market_value = get_account_holdings_total(investment.institution_account_id)
                WHERE investment.investment_type = 'IMA';
                UPDATE investment
                SET market_value = get_pool_holdings_total(investment.id)
                WHERE investment.investment_type = 'POOL';
                UPDATE investment
                SET total_units = get_pool_units_total(investment.id)
                WHERE investment.investment_type = 'POOL';
                UPDATE investment
                SET market_value_as_of = (SELECT CURRENT_TIMESTAMP);
                RETURN NULL;
            END
            $$ LANGUAGE plpgsql;
        `);

        await queryRunner.query(`
            CREATE TRIGGER TR_holding_insert
            AFTER INSERT ON holding
            FOR EACH STATEMENT EXECUTE PROCEDURE investment_market_value_update();
        `);
        await queryRunner.query(`
            CREATE TRIGGER TR_pool_investment_holding_insert
            AFTER INSERT ON pool_investment_holding
            FOR EACH STATEMENT EXECUTE PROCEDURE investment_market_value_update();
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TRIGGER IF EXISTS TR_holding_insert ON holding`);
        await queryRunner.query(`DROP TRIGGER IF EXISTS TR_pool_investment_holding_insert ON pool_investment_holding`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS investment_market_value_update`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS get_account_holdings_total`);
    }
}
