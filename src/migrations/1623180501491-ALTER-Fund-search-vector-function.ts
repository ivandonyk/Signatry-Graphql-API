import {MigrationInterface, QueryRunner} from "typeorm";

export class ALTERFundSearchVectorFunction1623180501491 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_fund_tsvector(fund_code character varying, fund_name character varying) RETURNS TSVECTOR AS $$
            BEGIN
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    fund_name || ' ' ||
                    fund_code
                );
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_fund_tsvector(NEW.fund_code, NEW.name);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_fund_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                fund_name TEXT;
                fund_code TEXT;
            BEGIN
                SELECT
                    fund.name,
                    fund.fund_code
                INTO
                    fund_name,
                    fund_code
                FROM fund
                WHERE fund.id = target_ID;

                RETURN to_tsvector(
                    'pg_catalog.simple',
                    fund_name || ' ' ||
                    fund_code
                );
            END
            $$ LANGUAGE plpgsql
        `);
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_fund_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);
    }

}
