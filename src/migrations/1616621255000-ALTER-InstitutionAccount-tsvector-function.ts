import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERInstitutionAccountTsvectorFunction1616621255000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Only trigger this function if the fund name changes, don't need to run this if other fields change
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION institution_account_fund_insert_update() RETURNS trigger AS $$
            DECLARE
                institution_account_ids UUID[];
            BEGIN
                IF NEW.name != OLD.name THEN
                    SELECT array_agg(institution_account.id::UUID)
                    INTO institution_account_ids
                    FROM institution_account
                    LEFT JOIN investment ON investment.institution_account_id = institution_account.id
                    LEFT JOIN fund_investment ON fund_investment.investment_id = investment.id
                    WHERE fund_investment.fund_id = NEW.id;
                    UPDATE institution_account
                    SET search_vector = get_institution_account_tsvector(institution_account)
                    WHERE id::UUID = ANY(institution_account_ids::UUID[]);
                END IF;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);
        
        await queryRunner.query(`DROP TRIGGER TR_holding_insert ON holding`);
        await queryRunner.query(`DROP TRIGGER TR_pool_investment_holding_insert ON pool_investment_holding`);
        await queryRunner.query(`DROP FUNCTION investment_market_value_update`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
}
