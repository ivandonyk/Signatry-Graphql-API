import { MigrationInterface, QueryRunner } from 'typeorm';

export class ALTERFundAddSearchVector1600881515979 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add column for search vector
        await queryRunner.query('ALTER TABLE fund ADD COLUMN search_vector TSVECTOR');

        // Create gin index for new column
        await queryRunner.query('CREATE INDEX fund_search ON "fund" USING gin(search_vector)');

        // Function to update search vector
        await queryRunner.query(/* sql */ `
            CREATE OR REPLACE FUNCTION get_fund_tsvector(target_id UUID) RETURNS TSVECTOR AS $$
            DECLARE
                fund_name TEXT;
                fund_code TEXT;
                primary_first_name TEXT;
                primary_last_name TEXT;
                primary_emails TEXT;
            BEGIN
                -- get single values
                SELECT
                    fund.name,
                    fund.fund_code
                INTO
                    fund_name,
                    fund_code
                FROM fund
                WHERE fund.id = target_ID;

                -- get single values
                SELECT
                    fund_contact.first_name,
                    fund_contact.last_name
                INTO
                    primary_first_name,
                    primary_last_name
                FROM fund_contact
                WHERE fund_contact.fund_id = target_ID AND fund_contact.is_primary;

                -- aggregate emails for primary contact
                SELECT string_agg(replace(value, '@', ' '), ' ')
                INTO primary_emails
                FROM fund_contact_email
                LEFT JOIN fund_contact ON fund_contact.id = fund_contact_email.fund_contact_id
                WHERE fund_contact.fund_id = target_id;

                -- populate tsvector
                RETURN to_tsvector(
                    'pg_catalog.simple',
                    fund_name || ' ' ||
                    fund_code || ' ' ||
                    primary_first_name || ' ' ||
                    primary_last_name || ' ' ||
                    COALESCE(primary_emails, '') 
                );
            END
            $$ LANGUAGE plpgsql
        `);

        // trigger to run on updates/inserts to fund
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_insert_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := get_fund_tsvector(NEW.id);
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind fund trigger
        await queryRunner.query(`
            CREATE TRIGGER fund_insert_update
            BEFORE INSERT OR UPDATE ON "fund"
            FOR EACH ROW EXECUTE PROCEDURE fund_insert_update()
        `);

        // trigger to run on updates/inserts to fund_contact
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_contact_insert_update() RETURNS trigger AS $$
            BEGIN
                UPDATE fund
                SET search_vector = get_fund_tsvector(NEW.fund_id)
                WHERE id = NEW.fund_id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind fund trigger
        await queryRunner.query(`
            CREATE TRIGGER fund_contact_insert_update
            AFTER INSERT OR UPDATE ON "fund_contact"
            FOR EACH ROW EXECUTE PROCEDURE fund_contact_insert_update()
        `);

        // trigger to run on updates/inserts to fund_contact_email
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION fund_contact_email_insert_update() RETURNS trigger AS $$
            DECLARE
                fund_id TEXT;
            BEGIN
                SELECT fund.id
                INTO fund_id
                FROM fund
                LEFT JOIN fund_contact ON fund_contact.fund_id = fund.id
                WHERE fund_contact_id = NEW.fund_contact_id;

                UPDATE fund
                SET search_vector = get_fund_tsvector(fund_id)
                WHERE id = fund_id;
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql
        `);

        // bind fund trigger
        await queryRunner.query(`
            CREATE TRIGGER fund_contact_email_insert_update
            AFTER INSERT OR UPDATE ON "fund_contact_email"
            FOR EACH ROW EXECUTE PROCEDURE fund_contact_email_insert_update()
        `);

        // trigger first build
        await queryRunner.query('UPDATE fund set id = id');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // drop triggers
        await queryRunner.query('DROP TRIGGER IF EXISTS fund_insert_update ON "fund";');
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS fund_contact_insert_update ON "fund_contact";'
        );
        await queryRunner.query(
            'DROP TRIGGER IF EXISTS fund_contact_email_insert_update ON "fund_contact_email";'
        );

        // drop functions
        await queryRunner.query('DROP FUNCTION IF EXISTS fund_insert_update');
        await queryRunner.query('DROP FUNCTION IF EXISTS fund_contact_insert_update');
        await queryRunner.query('DROP FUNCTION IF EXISTS fund_contact_email_insert_update');

        // restore fund table
        await queryRunner.query('DROP INDEX IF EXISTS fund_search');
        await queryRunner.query('ALTER TABLE fund DROP COLUMN IF EXISTS search_vector');
    }
}
