import { FundRoleNameValues } from '../models/FundRole';
import { InvestmentType } from '../models/Investment';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERInstitutionAccountTSVectorTrigger1603833133775 implements MigrationInterface {
    name?: string;
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_insert_update ON "institution_account"'
        );

        await queryRunner.query('DROP FUNCTION IF EXISTS institution_account_update');

        await queryRunner.query(
            'DROP FUNCTION IF EXISTS get_institution_account_tsvector(target_id UUID)'
        );

        await queryRunner.query('DROP FUNCTION IF EXISTS get_institution_account_tsvector(record)');

        const [{ id: faId }] = await queryRunner.query(
            'SELECT id FROM "fund_role" WHERE "name" = \'FINANCIAL_ADVISOR\''
        );

        // create function to update search vector
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_institution_account_tsvector(institution_account RECORD) RETURNS TSVECTOR AS $$
            DECLARE
                first_name TEXT;
                last_name TEXT;
                fund_name TEXT;
                fund_id TEXT;
            BEGIN
                SELECT
                    user_profile.first_name,
                    user_profile.last_name
                INTO
                    first_name,
                    last_name
                FROM user_profile
                LEFT JOIN fund_user_profile ON fund_user_profile.user_profile_id = user_profile.id AND fund_user_profile.fund_role_id = '${faId}'
                LEFT JOIN fund ON fund_user_profile.fund_id = fund.id
                LEFT JOIN fund_investment ON fund_investment.fund_id = fund.id 
                LEFT JOIN investment ON fund_investment.investment_id = investment.id
                WHERE investment.institution_account_id = institution_account.id
                AND investment_type = '${InvestmentType.IMA}'
                ORDER BY fund_user_profile.created_on ASC
                LIMIT 1;
                
                SELECT fund.name
                INTO fund_name
                FROM fund
                LEFT JOIN fund_investment ON fund_investment.fund_id = fund.id 
                LEFT JOIN investment ON fund_investment.investment_id = investment.id
                WHERE investment.institution_account_id = institution_account.id;
                
                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    institution_account.custodian_name || ' ' ||
                    institution_account.display_name || ' ' ||
                    institution_account.name || ' ' ||
                    institution_account.account_number || ' ' ||
                    COALESCE(first_name, '') || ' ' ||
                    COALESCE(last_name, '') || ' ' ||
                    COALESCE(fund_name, '')
                );
                
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger function to run on institution_account insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION institution_account_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_institution_account_tsvector(NEW);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
          `);

        // bind institution_account insert/update trigger
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER institution_account_insert_update
            BEFORE
            INSERT
            OR
            UPDATE ON "institution_account"
            FOR EACH ROW EXECUTE PROCEDURE institution_account_insert_update()
        `);

        // trigger function to run on institution_account insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION institution_account_fund_insert_update() RETURNS trigger AS $$
            DECLARE
                institution_account_ids UUID[];
            BEGIN
                SELECT array_agg(institution_account.id::UUID)
                INTO institution_account_ids
                FROM institution_account
                LEFT JOIN investment ON investment.institution_account_id = institution_account.id
                LEFT JOIN fund_investment ON fund_investment.investment_id = investment.id
                WHERE fund_investment.fund_id = NEW.id;
                UPDATE institution_account
                SET search_vector = get_institution_account_tsvector(institution_account)
                WHERE id::UUID = ANY(institution_account_ids::UUID[]);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind fund insert/update trigger
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER institution_account_fund_insert_update AFTER
            INSERT
            OR
            UPDATE ON "fund"
            FOR EACH ROW EXECUTE PROCEDURE institution_account_fund_insert_update()
        `);

        // trigger function to run on institution_account insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION institution_account_user_profile_insert_update() RETURNS trigger AS $$
                DECLARE
                    institution_account_ids UUID[];
                BEGIN
                    SELECT array_agg(institution_account.id::UUID)
                    INTO institution_account_ids
                    FROM institution_account
                    LEFT JOIN investment ON investment.institution_account_id = institution_account.id
                    LEFT JOIN fund_investment ON fund_investment.investment_id = investment.id
                    LEFT JOIN fund ON fund_investment.fund_id = fund.id
                    LEFT JOIN fund_user_profile ON fund_user_profile.fund_id = fund.id 
                    WHERE fund_user_profile.user_profile_id = NEW.id
                    AND fund_user_profile.fund_role_id = '${faId}'
                    AND investment_type = '${InvestmentType.IMA}';

                    UPDATE institution_account
                    SET search_vector = get_institution_account_tsvector(institution_account)
                    WHERE id::UUID = ANY(institution_account_ids::UUID[]);
                    RETURN NEW;
                END
               $$ LANGUAGE plpgsql
           `);

        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER institution_account_user_profile_insert_update AFTER
            INSERT
            OR
            UPDATE ON "user_profile"
            FOR EACH ROW EXECUTE PROCEDURE institution_account_user_profile_insert_update()
        `);

        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION institution_account_fund_user_profile_insert_update() RETURNS trigger AS $$
            DECLARE
                institution_account_ids UUID[];
            BEGIN
                SELECT array_agg(institution_account.id::UUID)
                INTO institution_account_ids
                FROM institution_account
                LEFT JOIN investment ON investment.institution_account_id = institution_account.id
                LEFT JOIN fund_investment ON fund_investment.investment_id = investment.id
                LEFT JOIN fund ON fund_investment.fund_id = fund.id
                LEFT JOIN fund_user_profile ON fund_user_profile.fund_id = fund.id
                WHERE fund_user_profile.id = NEW.id
                AND fund_user_profile.fund_role_id = '${faId}';

                UPDATE institution_account
                SET search_vector = get_institution_account_tsvector(institution_account)
                WHERE id::UUID = ANY(institution_account_ids::UUID[]);
                
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        await queryRunner.query(/*sql*/ `
        CREATE TRIGGER institution_account_fund_user_profile_insert_update
            AFTER INSERT OR UPDATE ON "fund_user_profile"
            FOR EACH ROW EXECUTE PROCEDURE institution_account_fund_user_profile_insert_update()
        `);

        // trigger update to run function
        await queryRunner.query('UPDATE institution_account set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_insert_update ON "institution_account"'
        );
        await queryRunner.query('DROP FUNCTION IF EXISTS institution_account_insert_update');
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS get_institution_account_tsvector(target_id UUID)'
        );

        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_fund_insert_update ON "fund"'
        );
        await queryRunner.query('DROP FUNCTION IF EXISTS institution_account_fund_insert_update');
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_user_profile_insert_update ON "user_profile"'
        );
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS institution_account_user_profile_insert_update'
        );

        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_fund_user_profile_insert_update ON "fund_user_profile"'
        );
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS institution_account_fund_user_profile_insert_update'
        );
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_fund_insert_update ON "fund";'
        );
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_user_profile_insert_update ON "user_profile";'
        );
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS institution_account_fund_user_profile_insert_update ON "fund_user_profile";'
        );

        await queryRunner.query(
            'DROP FUNCTION IF EXISTS get_institution_account_tsvector(target_id UUID)'
        );

        await queryRunner.query(
            'DROP FUNCTION IF EXISTS get_institution_account_tsvector(record RECORD)'
        );

        await queryRunner.query('DROP FUNCTION IF EXISTS institution_account_insert_update;');
        await queryRunner.query('DROP FUNCTION IF EXISTS institution_account_fund_insert_update;');
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS institution_account_user_profile_insert_update;'
        );
        await queryRunner.query(
            'DROP FUNCTION IF EXISTS institution_account_fund_user_profile_insert_update;'
        );

        // create function to update search vector
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_institution_account_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
                        DECLARE
                        	custodian_name TEXT;
                        	display_name TEXT;
                        	account_number TEXT;
                        BEGIN
                        	-- get single values
                        	SELECT
                        		institution_account.custodian_name,
                        		institution_account.display_name,
                        		institution_account.account_number INTO custodian_name,
                        		display_name,
                        		account_number
                        	FROM
                        		institution_account
                        	WHERE
                        		institution_account.id = target_id;
                        	-- populate tsvector
                        	RETURN to_tsvector('pg_catalog.simple', custodian_name || ' ' || display_name || ' ' || account_number || ' ');
                        END
                        $$ LANGUAGE plpgsql
        `);

        // trigger function to run on institution_account insert/update
        await queryRunner.query(/*sql*/ `
            CREATE OR REPLACE FUNCTION institution_account_insert_update() RETURNS TRIGGER AS $$
                        BEGIN
                        	NEW.search_vector := get_institution_account_tsvector(NEW.id);
                        	RETURN NEW;
                        END
                        $$ LANGUAGE plpgsql
        `);

        // bind institution_account insert/update trigger
        await queryRunner.query(/*sql*/ `
            CREATE TRIGGER institution_account_insert_update
            BEFORE
            INSERT
            OR
            UPDATE ON "institution_account"
            FOR EACH ROW EXECUTE PROCEDURE institution_account_insert_update()
        `);

        await queryRunner.query('UPDATE institution_account set id = id');
    }
}
